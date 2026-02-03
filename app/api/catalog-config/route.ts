import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const configFilePath = path.join(process.cwd(), 'public', 'catalog-config.json')
const catalogsDir = path.join(process.cwd(), 'public', 'catalogs')

// Função auxiliar para parsear seguidores
function parseFollowers(followersStr: string): number {
  if (!followersStr || followersStr === 'N/A' || followersStr === '0') return 0
  const cleaned = followersStr.replace(/[^\d.,KkMmBb]/g, '')
  if (cleaned.toLowerCase().includes('k')) {
    const num = parseFloat(cleaned.replace(/[kK]/g, '').replace(',', '.'))
    return Math.floor(num * 1000)
  }
  if (cleaned.toLowerCase().includes('m')) {
    const num = parseFloat(cleaned.replace(/[mM]/g, '').replace(',', '.'))
    return Math.floor(num * 1000000)
  }
  return parseInt(cleaned.replace(/[^\d]/g, '') || '0')
}

// Função auxiliar para obter nome do grupo
function getGroupName(followers: number): string {
  if (followers < 1000) return 'inicio'
  const groupK = Math.floor(followers / 1000)
  return `${groupK}k`
}

// Função para limpar nome de exibição
function cleanDisplayName(name: string): string {
  if (!name) return ''
  return name.replace(/\s*\(@[^)]+\)\s*on\s+Kwai\s*$/i, '').trim()
}

// Função para normalizar nome para cópia
function normalizeNameForCopy(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// Função para obter data/hora do último histórico
async function getLastHistoryDate(): Promise<string | null> {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'history')
    if (!existsSync(historyDir)) {
      return null
    }

    const files = await readdir(historyDir)
    const jsonFiles = files
      .filter(file => file.startsWith('historico_') && file.endsWith('.json'))
      .sort()
      .reverse()

    if (jsonFiles.length === 0) {
      return null
    }

    const latestJsonFile = jsonFiles[0]
    // Extrair data do nome do arquivo: historico_2025-11-02H03-25.json
    const dateMatch = latestJsonFile.match(/historico_(\d{4})-(\d{2})-(\d{2})H(\d{2})-(\d{2})\.json/)
    if (dateMatch) {
      const [, year, month, day, hour, minute] = dateMatch
      return `${day}/${month}/${year} ${hour}:${minute}`
    }
    return null
  } catch (error: any) {
    console.error('Erro ao obter data do histórico:', error)
    return null
  }
}

// Função para carregar contas reservadas
async function loadReservedAccounts(): Promise<Set<string>> {
  try {
    const reservedAccountsFilePath = path.join(process.cwd(), 'public', 'reserved-accounts.txt')
    if (!existsSync(reservedAccountsFilePath)) {
      return new Set()
    }

    const content = await readFile(reservedAccountsFilePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim() !== '')
    
    const reservedEmails = new Set<string>()
    lines.forEach(line => {
      const parts = line.split('|')
      if (parts.length >= 1 && parts[0]?.trim()) {
        reservedEmails.add(parts[0].trim().toLowerCase())
      }
    })
    
    return reservedEmails
  } catch (error: any) {
    console.error('Erro ao carregar contas reservadas:', error)
    return new Set()
  }
}

// Função para carregar perfis do histórico
async function loadProfilesFromHistory(): Promise<any[]> {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'history')
    if (!existsSync(historyDir)) {
      return []
    }

    const files = await readdir(historyDir)
    const jsonFiles = files
      .filter(file => file.startsWith('historico_') && file.endsWith('.json'))
      .sort()
      .reverse()

    if (jsonFiles.length === 0) {
      return []
    }

    const latestJsonFile = jsonFiles[0]
    const jsonFilePath = path.join(historyDir, latestJsonFile)
    const jsonContent = await readFile(jsonFilePath, 'utf-8')
    const jsonData = JSON.parse(jsonContent)

    // Carregar contas
    const accountsFilePath = path.join(process.cwd(), 'public', 'accounts-data.json')
    let accounts: any[] = []
    if (existsSync(accountsFilePath)) {
      const accountsContent = await readFile(accountsFilePath, 'utf-8')
      const accountsData = JSON.parse(accountsContent)
      accounts = accountsData.accounts || []
    }

    // Carregar contas reservadas
    const reservedEmails = await loadReservedAccounts()

    // Converter e associar IDs, filtrando contas reservadas
    return jsonData
      .map((item: any, index: number) => {
        let matchingAccount = null
        const profileEmail = (item.email || '').toLowerCase().trim()
        const profileName = (item.displayName || item.name || item.username || '').toLowerCase().trim()
        
        // Verificar se é conta reservada
        if (profileEmail && reservedEmails.has(profileEmail)) {
          return null // Marcar para filtrar depois
        }
        
        // Buscar conta correspondente
        if (profileEmail && accounts.length > 0) {
          matchingAccount = accounts.find(acc => {
            const accEmail = (acc.email || '').toLowerCase().trim()
            return accEmail && accEmail === profileEmail
          })
        }
        
        // Verificar se a conta encontrada está marcada como reservada
        if (matchingAccount?.reserved) {
          return null // Marcar para filtrar depois
        }
        
        if (!matchingAccount && profileName && accounts.length > 0) {
          matchingAccount = accounts.find(acc => {
            const accName = (acc.name || '').toLowerCase().trim()
            return accName && accName === profileName
          })
          
          // Verificar novamente se está reservada
          if (matchingAccount?.reserved) {
            return null // Marcar para filtrar depois
          }
        }
        
        if (!matchingAccount && accounts.length > 0 && index < accounts.length) {
          matchingAccount = accounts[index]
          
          // Verificar novamente se está reservada
          if (matchingAccount?.reserved) {
            return null // Marcar para filtrar depois
          }
        }

        let avatarUrl = item.avatar || ''
        if (avatarUrl && avatarUrl.startsWith('http://')) {
          avatarUrl = avatarUrl.replace('http://', 'https://')
        }

        return {
          email: item.email || '',
          displayName: item.displayName || item.name || item.username || '',
          avatar: avatarUrl,
          followers: item.followers || '0',
          likes: item.likes || '0',
          url: item.url || '',
          username: item.username || '',
          id: matchingAccount?.id || '',
        }
      })
      .filter((profile: any) => profile !== null) // Remover contas reservadas
  } catch (error: any) {
    console.error('Erro ao carregar perfis do histórico:', error)
    return []
  }
}

// Função para escapar HTML
function escapeHtml(text: string): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Função para escapar JavaScript
function escapeJs(text: string): string {
  if (!text) return ''
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

// Função para gerar HTML estático do catálogo
async function generateCatalogHTML(catalog: any, profiles: any[], lastUpdateDate: string | null): Promise<string> {
  // Agrupar perfis
  const groups: { [key: string]: any[] } = {}
  profiles.forEach(profile => {
    const followersNum = parseFollowers(profile.followers || '0')
    const groupName = getGroupName(followersNum)
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(profile)
  })

  // Filtrar grupos selecionados
  const filteredGroups: { [key: string]: any[] } = {}
  if (catalog.selectedGroups && catalog.selectedGroups.length > 0) {
    catalog.selectedGroups.forEach((groupName: string) => {
      if (groups[groupName]) {
        filteredGroups[groupName] = groups[groupName]
      }
    })
  } else {
    Object.assign(filteredGroups, groups)
  }

  // Calcular total de seguidores
  let totalFollowers = 0
  Object.values(filteredGroups).forEach(groupProfiles => {
    groupProfiles.forEach(profile => {
      totalFollowers += parseFollowers(profile.followers || '0')
    })
  })

  const formatFollowers = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Não há mais timer de expiração

  // Gerar HTML
  const groupEntries = Object.entries(filteredGroups).sort((a, b) => {
    if (a[0] === 'inicio') return -1
    if (b[0] === 'inicio') return 1
    const numA = parseInt(a[0].replace('k', '')) || 0
    const numB = parseInt(b[0].replace('k', '')) || 0
    return numA - numB
  })

    const groupsHTML = groupEntries.map(([groupName, groupProfiles]) => {
    const groupDisplayName = groupName === 'inicio' ? '< 1k' : groupName.toUpperCase()
    const profilesHTML = groupProfiles.map((profile, index) => {
      const displayName = cleanDisplayName(profile.displayName || profile.name || profile.email || 'N/A')
      const normalizedName = normalizeNameForCopy(displayName)
      const copyText = profile.id ? `${normalizedName}-${profile.id}` : ''
      const kwaiUrl = profile.url || (profile.email ? `https://k.kwai.com/u/@${profile.email.split('@')[0]}` : '')
      
      // Escapar valores para HTML
      const safeDisplayName = escapeHtml(displayName)
      const safeAvatar = escapeHtml(profile.avatar || '')
      const safeFollowers = escapeHtml(profile.followers || 'N/A')
      const safeLikes = escapeHtml(profile.likes || 'N/A')
      const safeId = escapeHtml(profile.id || '')
      const safeCopyText = escapeJs(copyText)
      const safeKwaiUrl = escapeHtml(kwaiUrl)
      const firstLetter = safeDisplayName[0]?.toUpperCase() || '?'

      return `
        <div class="profile-card bg-white rounded-2xl p-5 border border-gray-200 hover:border-purple-300 transition-colors">
          <div class="space-y-3">
            <div class="flex items-start gap-3">
              ${profile.avatar ? `
                <img src="${safeAvatar}" alt="${safeDisplayName}" class="w-16 h-16 rounded-2xl border-[3px] border-purple-400 object-cover flex-shrink-0 shadow-lg" onerror="this.style.display='none'">
              ` : `
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 border-[3px] border-purple-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span class="text-2xl text-white font-bold">${firstLetter}</span>
                </div>
              `}
              <div class="flex-1 min-w-0 pt-1">
                ${profile.id ? `
                  <div class="inline-block px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg mb-2">
                    <span class="text-xs text-purple-700 font-bold">ID: ${safeId}</span>
                  </div>
                ` : ''}
                <div class="font-bold text-gray-800 truncate text-base">${safeDisplayName}</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span class="text-sm">👥</span>
                </div>
                <div>
                  <div class="text-xs text-gray-500">Seguidores</div>
                  <div class="text-sm font-bold text-gray-800">${safeFollowers}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                  <span class="text-sm">❤️</span>
                </div>
                <div>
                  <div class="text-xs text-gray-500">Curtidas</div>
                  <div class="text-sm font-bold text-gray-800">${safeLikes}</div>
                </div>
              </div>
            </div>
            ${copyText ? `
              <button onclick="copyToClipboard('${safeCopyText}', this)" class="w-full mt-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 rounded-lg font-medium text-sm transition-all border border-purple-200">
                Copiar ID
              </button>
            ` : ''}
            ${kwaiUrl ? `
              <a href="${safeKwaiUrl}" target="_blank" class="w-full mt-2 block px-4 py-2 bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 hover:from-sky-100 hover:to-blue-100 rounded-lg font-medium text-sm transition-all border border-blue-200 text-center">
                Ver Perfil
              </a>
            ` : ''}
          </div>
        </div>
      `
    }).join('')

    return `
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">${groupDisplayName} (${groupProfiles.length} contas)</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          ${profilesHTML}
        </div>
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(catalog.name)} - Catálogo Kwai</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
  <div class="bg-white/80 backdrop-blur-lg shadow-lg border-b border-purple-100 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-6 py-5">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
            ${escapeHtml(catalog.name)}
          </h1>
          <p class="text-sm text-gray-600 font-medium">Número: <span class="text-purple-600 font-bold">${escapeHtml(catalog.number)}</span></p>
          ${catalog.selectedGroups && catalog.selectedGroups.length > 0 ? `
            <p class="text-sm text-gray-600 font-medium mt-1">
              Seguidores: <span class="text-purple-600 font-bold">${formatFollowers(totalFollowers)}</span>
              <span class="text-gray-500 ml-2">(${catalog.selectedGroups.join(', ')})</span>
            </p>
          ` : ''}
        </div>
        ${lastUpdateDate ? `
          <div class="text-right bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl px-6 py-3 shadow-lg">
            <div class="text-xs text-white/90 font-medium uppercase tracking-wide mb-1">Última Atualização</div>
            <div class="text-lg font-bold text-white">
              ${escapeHtml(lastUpdateDate)}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-6 py-8">
    ${groupsHTML}
  </div>

  <script>
    let currentGreenCard = null;
    let currentTimeout = null;

    function copyToClipboard(text, button) {
      navigator.clipboard.writeText(text).then(() => {
        // Remover verde da div anterior se existir
        if (currentGreenCard) {
          currentGreenCard.classList.remove('bg-green-50', 'border-green-300');
          currentGreenCard.classList.add('bg-white', 'border-gray-200');
        }
        
        // Limpar timeout anterior se existir
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }
        
        // Encontrar a div do perfil (card pai)
        const profileCard = button.closest('.profile-card');
        
        // Adicionar verde na div atual
        profileCard.classList.remove('bg-white', 'border-gray-200');
        profileCard.classList.add('bg-green-50', 'border-green-300');
        
        // Atualizar botão
        const originalText = button.textContent;
        button.textContent = 'Copiado';
        button.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
        button.classList.remove('bg-gradient-to-r', 'from-purple-50', 'to-pink-50', 'text-purple-700', 'border-purple-200');
        
        // Guardar referência da div atual
        currentGreenCard = profileCard;
        
        // Voltar ao normal após 2 segundos
        currentTimeout = setTimeout(() => {
          profileCard.classList.remove('bg-green-50', 'border-green-300');
          profileCard.classList.add('bg-white', 'border-gray-200');
          button.textContent = originalText;
          button.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
          button.classList.add('bg-gradient-to-r', 'from-purple-50', 'to-pink-50', 'text-purple-700', 'border-purple-200');
          currentGreenCard = null;
        }, 2000);
      }).catch(err => {
        console.error('Erro ao copiar:', err);
      });
    }

  </script>
</body>
</html>`
}

// GET é público (usado pela página de catálogo pública)
export async function GET() {
  try {
    // Se o arquivo não existe, retornar array vazio (não é erro)
    if (!existsSync(configFilePath)) {
      return NextResponse.json({ catalogs: [] })
    }

    let content: string
    try {
      content = await readFile(configFilePath, 'utf-8')
    } catch (readError: any) {
      console.error('Erro ao ler arquivo de configuração:', readError)
      // Se não conseguir ler, retornar array vazio
      return NextResponse.json({ catalogs: [] })
    }

    let data: any
    try {
      data = JSON.parse(content)
    } catch (parseError: any) {
      console.error('Erro ao parsear JSON de configuração:', parseError)
      // Se o JSON estiver corrompido, retornar array vazio
      return NextResponse.json({ catalogs: [] })
    }
    
    // Retornar todos os catálogos ativos (sem filtro de expiração)
    const activeCatalogs = (data.catalogs || []).filter((cat: any) => {
      return cat.active !== false
    })
    
    return NextResponse.json({ catalogs: activeCatalogs })
  } catch (error: any) {
    console.error('Erro ao carregar configurações:', error)
    // Em caso de erro, retornar array vazio ao invés de erro 500
    return NextResponse.json({ catalogs: [] })
  }
}

// POST requer autenticação (apenas admin pode criar catálogos)
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response || NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { name, selectedGroups } = await request.json()

    if (!selectedGroups || selectedGroups.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um grupo de seguidores' },
        { status: 400 }
      )
    }

    const catalogName = name || 'Contas do Kwai'

    // Gerar link aleatório
    const randomLink = crypto.randomBytes(16).toString('hex')
    
    // Carregar catálogos existentes para verificar números
    let catalogs = []
    if (existsSync(configFilePath)) {
      const content = await readFile(configFilePath, 'utf-8')
      const data = JSON.parse(content)
      catalogs = data.catalogs || []
    }

    // Gerar número aleatório único que nunca se repete
    let randomNumber: string
    let isUnique = false
    
    while (!isUnique) {
      // Gerar número aleatório de 6 dígitos
      randomNumber = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Verificar se já existe (verificar todos os catálogos)
      isUnique = !catalogs.some((cat: any) => cat.number === randomNumber)
    }
    
    console.log('[CATALOG] Criando catálogo:', {
      link: randomLink,
      createdAt: new Date().toISOString()
    })

    const catalog = {
      link: randomLink,
      number: randomNumber!,
      name: catalogName,
      createdAt: new Date().toISOString(),
      active: true,
      selectedGroups: selectedGroups || [] // Grupos selecionados
    }

    // Adicionar novo catálogo
    catalogs.push(catalog)

    const configDir = path.dirname(configFilePath)
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true })
    }

    await writeFile(configFilePath, JSON.stringify({ catalogs }, null, 2), 'utf-8')

    // Gerar e salvar HTML estático do catálogo
    try {
      console.log('[CATALOG] Carregando perfis para gerar HTML...')
      const profiles = await loadProfilesFromHistory()
      const lastUpdateDate = await getLastHistoryDate()
      console.log(`[CATALOG] ${profiles.length} perfis carregados`)
      console.log(`[CATALOG] Última atualização: ${lastUpdateDate || 'N/A'}`)
      
      const htmlContent = await generateCatalogHTML(catalog, profiles, lastUpdateDate)
      
      // Criar diretório de catálogos se não existir
      if (!existsSync(catalogsDir)) {
        await mkdir(catalogsDir, { recursive: true })
      }
      
      // Salvar arquivo HTML
      const htmlFilePath = path.join(catalogsDir, `${catalog.link}.html`)
      await writeFile(htmlFilePath, htmlContent, 'utf-8')
      console.log(`[CATALOG] HTML gerado e salvo em: ${htmlFilePath}`)
    } catch (htmlError: any) {
      console.error('[CATALOG] Erro ao gerar HTML:', htmlError)
      // Continuar mesmo se falhar - o catálogo ainda é criado
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Catálogo criado com sucesso',
      catalog,
      htmlUrl: `/catalogs/${catalog.link}.html`
    })
  } catch (error: any) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json(
      { error: `Erro ao salvar configuração: ${error.message}` },
      { status: 500 }
    )
  }
}

// DELETE requer autenticação (apenas admin pode deletar catálogos)
export async function DELETE(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response || NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { link } = await request.json()

    if (!link) {
      return NextResponse.json(
        { error: 'Link é obrigatório' },
        { status: 400 }
      )
    }

    let catalogs = []
    if (existsSync(configFilePath)) {
      const content = await readFile(configFilePath, 'utf-8')
      const data = JSON.parse(content)
      catalogs = data.catalogs || []
    }

    const originalLength = catalogs.length
    catalogs = catalogs.filter((cat: any) => cat.link !== link)
    
    // Verificar se realmente removeu algo
    if (catalogs.length === originalLength) {
      return NextResponse.json(
        { error: 'Catálogo não encontrado' },
        { status: 404 }
      )
    }

    // Remover arquivo HTML do catálogo
    try {
      const htmlFilePath = path.join(catalogsDir, `${link}.html`)
      if (existsSync(htmlFilePath)) {
        await unlink(htmlFilePath)
        console.log(`[CATALOG] HTML removido: ${htmlFilePath}`)
      }
    } catch (htmlError: any) {
      console.warn('[CATALOG] Aviso: Não foi possível remover HTML:', htmlError.message)
      // Continuar mesmo se falhar - o catálogo ainda é removido
    }

    const configDir = path.dirname(configFilePath)
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true })
    }

    try {
      await writeFile(configFilePath, JSON.stringify({ catalogs }, null, 2), 'utf-8')
    } catch (writeError: any) {
      console.warn('Aviso: Não foi possível salvar no sistema de arquivos:', writeError.message)
      // Continuar mesmo assim - no Vercel pode ser temporário
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Catálogo removido com sucesso',
      catalogs: catalogs.length
    })
  } catch (error: any) {
    console.error('Erro ao remover catálogo:', error)
    return NextResponse.json(
      { error: `Erro ao remover catálogo: ${error.message}` },
      { status: 500 }
    )
  }
}

