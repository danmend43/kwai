'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// Função para limpar o nome, removendo " (@username) on Kwai"
const cleanDisplayName = (name: string): string => {
  if (!name) return ''
  return name.replace(/\s*\(@[^)]+\)\s*on\s+Kwai\s*$/i, '').trim()
}

// Função para normalizar o nome para cópia (minúsculas, sem espaços, sem caracteres especiais)
const normalizeNameForCopy = (name: string): string => {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais e espaços
    .trim()
}

interface AccountData {
  id?: string
  email: string
  password: string
  name?: string
  number?: string
  cel?: string
  url?: string
  reserved?: boolean
}

interface CatalogConfig {
  link: string
  number: string
  name: string
  expirationMinutes: number
  expiresAt: string
  createdAt: string
  active: boolean
  selectedGroups?: string[]
}

interface ProfileData {
  email: string
  displayName: string
  avatar: string
  followers: string
  likes: string
  url?: string
  username?: string
  id?: string
}

export default function CatalogPage() {
  const params = useParams()
  const link = params.link as string
  
  const [catalog, setCatalog] = useState<CatalogConfig | null>(null)
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [profiles, setProfiles] = useState<ProfileData[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 })
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/catalog-config')
        if (response.ok) {
          const data = await response.json()
          const foundCatalog = data.catalogs?.find((cat: CatalogConfig) => cat.link === link)
          
          if (!foundCatalog) {
            setExpired(true)
            return
          }

          const now = new Date()
          const expiresAt = new Date(foundCatalog.expiresAt)
          
          // Debug: verificar dados do catálogo
          console.log('[CATALOG] Carregando catálogo:', {
            link: foundCatalog.link,
            expiresAt: foundCatalog.expiresAt,
            expiresAtParsed: expiresAt.toISOString(),
            now: now.toISOString(),
            expirationMinutes: foundCatalog.expirationMinutes,
            diffMinutes: Math.floor((expiresAt.getTime() - now.getTime()) / 60000)
          })
          
          if (expiresAt <= now) {
            setExpired(true)
            // Deletar catálogo expirado automaticamente
            try {
              await fetch('/api/catalog-config', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: foundCatalog.link }),
              })
            } catch (e) {
              console.error('Erro ao deletar catálogo expirado:', e)
            }
            return
          }

          setCatalog(foundCatalog)

          // Carregar contas cadastradas primeiro para ter os IDs
          const accountsResponse = await fetch('/api/accounts')
          let savedAccounts: AccountData[] = []
          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json()
            savedAccounts = accountsData.accounts || []
            setAccounts(savedAccounts)
          }
          
          // Carregar último histórico (igual à aba de grupos)
          const historyResponse = await fetch('/api/load-last-history')
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.profiles && historyData.profiles.length > 0) {
              // Associar IDs das contas cadastradas aos perfis do histórico - BUSCAR AGRESSIVAMENTE
              const profilesWithIds = historyData.profiles.map((profile: any, profileIndex: number) => {
                let matchingAccount = null
                const profileEmail = (profile.email || '').toLowerCase().trim()
                const profileName = (profile.displayName || profile.username || '').toLowerCase().trim()
                const profileUrlUsername = profile.url?.match(/@([^\/\?]+)/)?.[1]?.toLowerCase() || ''
                const profileUsername = (profile.username || '').toLowerCase().trim()
                
                // Tentativa 1: Email completo exato
                if (profileEmail && savedAccounts.length > 0) {
                  matchingAccount = savedAccounts.find(acc => {
                    const accEmail = (acc.email || '').toLowerCase().trim()
                    return accEmail && accEmail === profileEmail
                  })
                }
                
                // Tentativa 2: Username do email (parte antes do @)
                if (!matchingAccount && profileEmail) {
                  const profileEmailUser = profileEmail.split('@')[0]?.trim()
                  if (profileEmailUser && savedAccounts.length > 0) {
                    matchingAccount = savedAccounts.find(acc => {
                      const accEmail = (acc.email || '').toLowerCase().trim()
                      const accEmailUser = accEmail.split('@')[0]?.trim()
                      return accEmailUser && accEmailUser.toLowerCase() === profileEmailUser
                    })
                  }
                }
                
                // Tentativa 3: Nome/displayName exato
                if (!matchingAccount && profileName && savedAccounts.length > 0) {
                  matchingAccount = savedAccounts.find(acc => {
                    const accName = (acc.name || '').toLowerCase().trim()
                    return accName && accName === profileName
                  })
                }
                
                // Tentativa 4: Username da URL
                if (!matchingAccount && profileUrlUsername && savedAccounts.length > 0) {
                  matchingAccount = savedAccounts.find(acc => {
                    if (!acc.url) return false
                    const accUrlUsername = acc.url.match(/@([^\/\?]+)/)?.[1]?.toLowerCase()
                    return accUrlUsername && accUrlUsername === profileUrlUsername
                  })
                }
                
                // Tentativa 5: Nome parcial (contém ou é contido)
                if (!matchingAccount && profileName && savedAccounts.length > 0) {
                  matchingAccount = savedAccounts.find(acc => {
                    const accName = (acc.name || '').toLowerCase().trim()
                    if (!accName || !profileName) return false
                    return accName.includes(profileName) || profileName.includes(accName) || 
                           accName.replace(/\s+/g, '') === profileName.replace(/\s+/g, '')
                  })
                }
                
                // Tentativa 6: Username do perfil com email username
                if (!matchingAccount && profileUsername && savedAccounts.length > 0) {
                  matchingAccount = savedAccounts.find(acc => {
                    const accEmail = (acc.email || '').toLowerCase().trim()
                    const accEmailUser = accEmail.split('@')[0]?.trim()
                    return accEmailUser && accEmailUser.toLowerCase() === profileUsername
                  })
                }
                
                // Se NÃO encontrou, usar o índice da conta como último recurso
                // Isso garante que sempre terá um ID se houver contas cadastradas
                if (!matchingAccount && savedAccounts.length > 0) {
                  // Tentar pela posição/index se o número de perfis for igual ao de contas
                  if (profileIndex < savedAccounts.length && savedAccounts[profileIndex]?.id) {
                    matchingAccount = savedAccounts[profileIndex]
                  }
                }
                
                const finalId = matchingAccount?.id || ''
                
                if (!finalId && savedAccounts.length > 0) {
                  console.warn('⚠️ ID não encontrado para perfil:', {
                    email: profileEmail,
                    name: profileName,
                    username: profileUsername,
                    urlUsername: profileUrlUsername,
                    url: profile.url,
                    totalAccounts: savedAccounts.length
                  })
                }
                
                return {
                  ...profile,
                  id: finalId
                }
              })
              
              // Usar os perfis do histórico com IDs associados
              setProfiles(profilesWithIds)
            }
          }

          // Atualizar contador em tempo real (a cada segundo)
          // IMPORTANTE: Usar expiresAt fixo do catálogo, NÃO recalcular
          const updateTimer = () => {
            if (!foundCatalog || !foundCatalog.expiresAt) {
              setExpired(true)
              setTimeLeft({ minutes: 0, seconds: 0 })
              return
            }
            
            const now = new Date()
            const expiresAt = new Date(foundCatalog.expiresAt) // Usar o timestamp fixo salvo
            
            // Debug: verificar se expiresAt é válido
            if (isNaN(expiresAt.getTime())) {
              console.error('Erro: expiresAt inválido:', foundCatalog.expiresAt)
              setExpired(true)
              setTimeLeft({ minutes: 0, seconds: 0 })
              return
            }
            
            const diff = expiresAt.getTime() - now.getTime()
            
            if (diff <= 0) {
              setExpired(true)
              setTimeLeft({ minutes: 0, seconds: 0 })
              // Tentar deletar automaticamente quando expirar
              fetch('/api/catalog-config', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: foundCatalog.link }),
              }).catch(e => console.error('Erro ao deletar catálogo expirado:', e))
              return
            }
            
            const totalSeconds = Math.floor(diff / 1000)
            const minutes = Math.floor(totalSeconds / 60)
            const seconds = totalSeconds % 60
            
            setTimeLeft({ minutes, seconds })
          }

                  updateTimer()
                  const interval = setInterval(updateTimer, 1000)
                  
                  // Declarar variáveis dos intervals antes de usar
                  let expirationInterval: NodeJS.Timeout | null = null
                  let existenceCheckInterval: NodeJS.Timeout | null = null
                  
                  // Verificar e deletar quando expirar
                  const checkExpiration = () => {
                    if (!foundCatalog || !foundCatalog.expiresAt) {
                      setExpired(true)
                      clearInterval(interval)
                      if (expirationInterval) clearInterval(expirationInterval)
                      if (existenceCheckInterval) clearInterval(existenceCheckInterval)
                      return
                    }
                    
                    const now = new Date()
                    const expiresAt = new Date(foundCatalog.expiresAt)
                    if (expiresAt <= now) {
                      setExpired(true)
                      setTimeLeft({ minutes: 0, seconds: 0 })
                      // Deletar automaticamente
                      fetch('/api/catalog-config', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ link: foundCatalog.link }),
                      }).catch(e => console.error('Erro ao deletar catálogo expirado:', e))
                      clearInterval(interval)
                      if (expirationInterval) clearInterval(expirationInterval)
                      if (existenceCheckInterval) clearInterval(existenceCheckInterval)
                    }
                  }
                  
                  // Verificar periodicamente se o catálogo ainda existe (pode ter sido excluído)
                  const checkCatalogExists = async () => {
                    try {
                      const checkResponse = await fetch('/api/catalog-config')
                      if (checkResponse.ok) {
                        const checkData = await checkResponse.json()
                        const stillExists = checkData.catalogs?.some((cat: CatalogConfig) => cat.link === link)
                        if (!stillExists) {
                          setExpired(true)
                          clearInterval(interval)
                          if (expirationInterval) clearInterval(expirationInterval)
                          if (existenceCheckInterval) clearInterval(existenceCheckInterval)
                        }
                      }
                    } catch (e) {
                      console.error('Erro ao verificar catálogo:', e)
                    }
                  }
                  
                  expirationInterval = setInterval(checkExpiration, 1000)
                  // Verificar se catálogo ainda existe a cada 5 segundos
                  existenceCheckInterval = setInterval(checkCatalogExists, 5000)
                  
                  return () => {
                    clearInterval(interval)
                    if (expirationInterval) clearInterval(expirationInterval)
                    if (existenceCheckInterval) clearInterval(existenceCheckInterval)
                  }
                }
              } catch (e) {
                console.error('Erro ao carregar catálogo:', e)
                setExpired(true)
              }
            }

            if (link) {
              loadCatalog()
            }
          }, [link])

  const parseFollowers = (followersStr: string): number => {
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

  const getGroupName = (followers: number): string => {
    if (followers < 1000) return 'inicio'
    const groupK = Math.floor(followers / 1000)
    return `${groupK}k`
  }

  const groupedAccounts = (): { [key: string]: ProfileData[] } => {
    const groups: { [key: string]: ProfileData[] } = {}
    
    // Usar os perfis do histórico diretamente (igual à aba de grupos)
    profiles.forEach(profile => {
      // Filtrar contas reservadas
      const profileEmail = (profile.email || '').toLowerCase()
      const account = accounts.find(acc => 
        (acc.email || '').toLowerCase() === profileEmail
      )
      if (account?.reserved) {
        return // Não adicionar contas reservadas aos grupos
      }
      
      const followersNum = parseFollowers(profile.followers || '0')
      const groupName = getGroupName(followersNum)
      
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(profile)
    })
    
    return groups
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center transform transition-all animate-fade-in">
          <div className="text-7xl mb-6 animate-pulse">⏰</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Link Expirado ou Removido
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            Este link de catálogo expirou ou foi removido e não pode mais ser acessado.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 font-medium">
              O catálogo não está mais disponível.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Por favor, solicite um novo link ao administrador.
          </p>
        </div>
      </div>
    )
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <div className="text-gray-600 text-lg font-semibold">Carregando catálogo...</div>
        </div>
      </div>
    )
  }

  const allGroups = groupedAccounts()
  
  // Filtrar apenas os grupos selecionados no catálogo
  const filteredGroups: { [key: string]: ProfileData[] } = {}
  if (catalog.selectedGroups && catalog.selectedGroups.length > 0) {
    catalog.selectedGroups.forEach((groupName: string) => {
      if (allGroups[groupName]) {
        filteredGroups[groupName] = allGroups[groupName]
      }
    })
  } else {
    // Se não há grupos selecionados, mostrar todos (compatibilidade com catálogos antigos)
    Object.assign(filteredGroups, allGroups)
  }

  const groups = filteredGroups

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header moderno */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                {catalog.name}
              </h1>
              <p className="text-sm text-gray-600 font-medium">Número: <span className="text-purple-600 font-bold">{catalog.number}</span></p>
              {(() => {
                // Calcular total de seguidores dos grupos selecionados usando as funções já existentes
                let totalFollowers = 0
                if (catalog.selectedGroups && catalog.selectedGroups.length > 0) {
                  // Somar apenas dos grupos selecionados
                  catalog.selectedGroups.forEach(groupName => {
                    const groupProfiles = groupedAccounts()[groupName] || []
                    groupProfiles.forEach(profile => {
                      totalFollowers += parseFollowers(profile.followers || '0')
                    })
                  })
                } else {
                  // Se não há grupos selecionados, somar todos
                  profiles.forEach(profile => {
                    totalFollowers += parseFollowers(profile.followers || '0')
                  })
                }
                
                const formatFollowers = (num: number): string => {
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
                  return num.toString()
                }
                
                return catalog.selectedGroups && catalog.selectedGroups.length > 0 ? (
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Seguidores: <span className="text-purple-600 font-bold">{formatFollowers(totalFollowers)}</span>
                    <span className="text-gray-500 ml-2">({catalog.selectedGroups.join(', ')})</span>
                  </p>
                ) : null
              })()}
            </div>
            <div className="text-right bg-gradient-to-r from-red-500 to-orange-500 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-xs text-white/90 font-medium uppercase tracking-wide mb-1">Expira em</div>
              <div className="text-3xl font-bold text-white">
                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {timeLeft.minutes > 0 ? `${timeLeft.minutes} minuto${timeLeft.minutes !== 1 ? 's' : ''} e ` : ''}
                {timeLeft.seconds} segundo{timeLeft.seconds !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedGroup ? (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Selecione um Grupo</h2>
              <p className="text-gray-600">Escolha uma faixa de seguidores para visualizar as contas</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Object.entries(groups)
                .sort((a, b) => {
                  if (a[0] === 'inicio') return -1
                  if (b[0] === 'inicio') return 1
                  const numA = parseInt(a[0].replace('k', '')) || 0
                  const numB = parseInt(b[0].replace('k', '')) || 0
                  return numA - numB
                })
                .map(([groupName, groupAccounts]) => (
                  <div
                    key={groupName}
                    onClick={() => setSelectedGroup(groupName)}
                    className="bg-white rounded-2xl p-6 cursor-pointer hover:scale-105 transition-all duration-300 shadow-md hover:shadow-2xl border-2 border-transparent hover:border-purple-400 group"
                  >
                    <div className="text-center">
                      <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">
                        {groupName === 'inicio' ? '< 1k' : groupName.toUpperCase()}
                      </div>
                      <div className="text-3xl font-bold text-gray-800 mb-1">
                        {groupAccounts.length}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">contas</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2.5 bg-white rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-md hover:shadow-lg border border-gray-300 hover:border-purple-400 flex items-center gap-2"
              >
                <span>←</span>
                <span>Voltar</span>
              </button>
              <div className="bg-purple-600 rounded-lg px-5 py-2.5 text-white shadow-md">
                <div className="text-xs font-medium opacity-90 mb-0.5">Grupo Selecionado</div>
                <div className="text-xl font-bold">
                  {selectedGroup === 'inicio' ? '< 1k' : selectedGroup.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groups[selectedGroup]?.map((profile, index) => {
                // Buscar conta correspondente - FORÇAR encontrar sempre
                let account = null
                const profileEmail = (profile.email || '').toLowerCase().trim()
                const profileName = (profile.displayName || profile.username || '').toLowerCase().trim()
                const profileUrlUsername = profile.url?.match(/@([^\/\?]+)/)?.[1]?.toLowerCase() || ''
                
                // Tentativa 1: Email completo exato
                if (profileEmail) {
                  account = accounts.find(acc => {
                    const accEmail = (acc.email || '').toLowerCase().trim()
                    return accEmail && accEmail === profileEmail
                  })
                }
                
                // Tentativa 2: Username do email
                if (!account && profileEmail) {
                  const profileEmailUser = profileEmail.split('@')[0]
                  if (profileEmailUser) {
                    account = accounts.find(acc => {
                      const accEmail = (acc.email || '').toLowerCase().trim()
                      const accEmailUser = accEmail.split('@')[0]
                      return accEmailUser && accEmailUser === profileEmailUser
                    })
                  }
                }
                
                // Tentativa 3: Nome/displayName exato
                if (!account && profileName) {
                  account = accounts.find(acc => {
                    const accName = (acc.name || '').toLowerCase().trim()
                    return accName && accName === profileName
                  })
                }
                
                // Tentativa 4: Username da URL
                if (!account && profileUrlUsername) {
                  account = accounts.find(acc => {
                    if (!acc.url) return false
                    const accUrlUsername = acc.url.match(/@([^\/\?]+)/)?.[1]?.toLowerCase()
                    return accUrlUsername && accUrlUsername === profileUrlUsername
                  })
                }
                
                // Tentativa 5: Nome parcial (contém ou é contido)
                if (!account && profileName) {
                  account = accounts.find(acc => {
                    const accName = (acc.name || '').toLowerCase().trim()
                    if (!accName || !profileName) return false
                    return accName.includes(profileName) || profileName.includes(accName)
                  })
                }
                
                // Tentativa 6: Username do perfil com email username
                if (!account && profile.username) {
                  const profileUsername = profile.username.toLowerCase().trim()
                  account = accounts.find(acc => {
                    const accEmailUser = (acc.email || '').split('@')[0]?.toLowerCase()
                    return accEmailUser && accEmailUser === profileUsername
                  })
                }
                
                // Se ainda não encontrou, logar para debug
                if (!account && accounts.length > 0) {
                  console.warn('Conta não encontrada para perfil:', {
                    profileEmail,
                    profileName,
                    profileUrlUsername,
                    profileUsername: profile.username
                  })
                }
                
                // SEMPRE usar o ID da conta cadastrada - SE NÃO ENCONTROU, USAR O PRIMEIRO DISPONÍVEL OU GERAR
                const accountId = account?.id || profile.id || ''
                
                // Buscar URL do Kwai
                const getKwaiUrl = (): string | null => {
                  // Prioridade: profile.url > account.url > gerar pelo email
                  if (profile.url) return profile.url
                  if (account?.url) return account.url
                  
                  // Gerar URL pelo email
                  const emailUsername = profile.email?.split('@')[0] || ''
                  if (emailUsername) {
                    return `https://k.kwai.com/u/@${emailUsername}`
                  }
                  return null
                }
                
                const kwaiUrl = getKwaiUrl()
                const displayName = cleanDisplayName(profile.displayName || account?.name || profile.email || 'N/A')
                const isSelected = selectedProfileIndex === index
                
                const handleCardClick = () => {
                  if (isSelected) {
                    setSelectedProfileIndex(null)
                  } else {
                    setSelectedProfileIndex(index)
                  }
                }
                
                const handleCopyId = async (e: React.MouseEvent) => {
                  e.stopPropagation()
                  if (accountId) {
                    try {
                      const normalizedName = normalizeNameForCopy(displayName)
                      const textToCopy = `${normalizedName}-${accountId}`
                      await navigator.clipboard.writeText(textToCopy)
                      setCopiedId(accountId)
                      setTimeout(() => {
                        setCopiedId(null)
                      }, 3000)
                    } catch (e) {
                      console.error('Erro ao copiar ID:', e)
                    }
                  }
                }
                
                const handleViewProfile = (e: React.MouseEvent) => {
                  e.stopPropagation()
                  if (kwaiUrl) {
                    window.open(kwaiUrl, '_blank')
                  }
                }
                
                return (
                  <div
                    key={index}
                    onClick={handleCardClick}
                    className={`bg-white rounded-2xl p-5 cursor-pointer transition-colors duration-200 ${
                      isSelected ? 'border-2 border-purple-500' : 'border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {!isSelected ? (
                      // Card normal com foto e informações
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          {profile.avatar ? (
                            <img
                              src={profile.avatar}
                              alt={displayName}
                              className="w-16 h-16 rounded-2xl border-[3px] border-purple-400 object-cover flex-shrink-0 shadow-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 border-[3px] border-purple-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-2xl text-white font-bold">
                                {displayName[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pt-1">
                            {accountId && (
                              <div className="inline-block px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg mb-2">
                                <span className="text-xs text-purple-700 font-bold">ID: {accountId}</span>
                              </div>
                            )}
                            <div className="font-bold text-gray-800 truncate text-base">
                              {displayName}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-sm">👥</span>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Seguidores</div>
                              <div className="text-sm font-bold text-gray-800">{profile.followers || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                              <span className="text-sm">❤️</span>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Curtidas</div>
                              <div className="text-sm font-bold text-gray-800">{profile.likes || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2">
                          <div className="text-xs text-center text-gray-500 font-medium">
                            Clique para ver opções
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Card expandido com opções
                      <div className="flex flex-col gap-3 py-2">
                        <div className="text-center border-b border-gray-200 pb-3">
                          <div className="text-base font-semibold text-gray-800 mb-2">
                            {displayName}
                          </div>
                          {accountId ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200">
                              <span className="text-xs font-medium text-purple-600">ID</span>
                              <span className="text-sm font-bold text-purple-700">{accountId}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                              <span className="text-xs text-gray-500">ID não disponível</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {accountId ? (
                            <button
                              onClick={handleCopyId}
                              className={`group relative w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                                copiedId === accountId
                                  ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-green-500/30'
                                  : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 border border-purple-200 hover:border-purple-300 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                {copiedId === accountId ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copiar ID</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ) : (
                            <div className="w-full px-4 py-3 bg-gray-50 text-gray-400 font-medium rounded-xl text-center text-sm border border-gray-200">
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                <span>ID não disponível</span>
                              </div>
                            </div>
                          )}
                          {kwaiUrl ? (
                            <button
                              onClick={handleViewProfile}
                              className="group w-full px-4 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 hover:from-sky-100 hover:to-blue-100 border border-blue-200 hover:border-blue-300 shadow-sm transition-all duration-200"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Ver Perfil</span>
                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </button>
                          ) : (
                            <div className="w-full px-4 py-3 bg-gray-50 text-gray-400 font-medium rounded-xl text-center text-sm border border-gray-200">
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                                <span>Perfil não disponível</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

