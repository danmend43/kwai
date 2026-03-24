import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Função para carregar contas do arquivo accounts-data.json
async function loadAccountsData() {
  try {
    const accountsFilePath = path.join(process.cwd(), 'public', 'accounts-data.json')
    if (!existsSync(accountsFilePath)) {
      return []
    }
    
    const content = await readFile(accountsFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    // Retornar apenas contas não reservadas
    return (data.accounts || []).filter((acc: any) => !acc.reserved)
  } catch (error) {
    console.error('Erro ao carregar contas:', error)
    return []
  }
}

// GET é público para permitir acesso do catálogo público
export async function GET(request: NextRequest) {
  // GET é público - não requer autenticação
  try {
    const historyDir = path.join(process.cwd(), 'public', 'history')
    
    if (!existsSync(historyDir)) {
      return NextResponse.json({ profiles: [] })
    }

    // Carregar contas não reservadas do arquivo accounts-data.json
    const accountData = await loadAccountsData()

    // Tentar primeiro ler arquivo JSON (mais fácil)
    const files = await readdir(historyDir)
    const jsonFiles = files
      .filter(file => file.startsWith('historico_') && file.endsWith('.json'))
      .sort()
      .reverse() // Mais recente primeiro

    if (jsonFiles.length > 0) {
      const latestJsonFile = jsonFiles[0]
      const jsonFilePath = path.join(historyDir, latestJsonFile)
      const jsonContent = await readFile(jsonFilePath, 'utf-8')
      const jsonData = JSON.parse(jsonContent)

      // Filtrar apenas perfis que correspondem a contas não reservadas
      const filteredProfiles = jsonData.filter((item: any) => {
        // Verificar se o perfil corresponde a uma conta não reservada
        const matchingAccount = accountData.find((acc: any) => 
          (item.email && acc.email?.toLowerCase() === item.email?.toLowerCase()) ||
          (item.url && acc.url && acc.url.toLowerCase() === item.url.toLowerCase())
        )
        return !!matchingAccount
      })

      // Converter dados do JSON para formato de ProfileData
      const profiles = filteredProfiles.map((item: any) => {
        const account = accountData.find((acc: any) => 
          (item.email && acc.email?.toLowerCase() === item.email?.toLowerCase()) ||
          (item.url && acc.url && acc.url.toLowerCase() === item.url.toLowerCase()) ||
          (item.name && acc.name?.toLowerCase() === item.name?.toLowerCase())
        )

        // Garantir HTTPS no avatar
        let avatarUrl = item.avatar || ''
        if (avatarUrl && avatarUrl.startsWith('http://')) {
          avatarUrl = avatarUrl.replace('http://', 'https://')
        }

        return {
          url: item.url || '',
          email: item.email || account?.email || '',
          password: account?.password || '',
          username: item.username || '',
          name: item.name || account?.name || item.username || '',
          displayName: item.name || account?.name || '',
          followers: item.followers || account?.followers || '',
          likes: item.likes || '',
          avatar: avatarUrl,
          bio: '',
          verified: item.verified || account?.verified || false,
          sequence: 0
        }
      })

      return NextResponse.json({ profiles })
    }

    // Se não tiver JSON, tentar ler do TXT
    const txtFiles = files
      .filter(file => file.startsWith('historico_') && file.endsWith('.txt'))
      .sort()
      .reverse()

    if (txtFiles.length === 0) {
      return NextResponse.json({ profiles: [] })
    }

    const latestTxtFile = txtFiles[0]
    const txtFilePath = path.join(historyDir, latestTxtFile)
    const content = await readFile(txtFilePath, 'utf-8')

    // Extrair dados dos perfis do arquivo TXT
    const profiles: any[] = []
    const lines = content.split('\n')
    
    let currentProfile: any = null

    for (const line of lines) {
      if (line.match(/^\[(\d+)\]/)) {
        if (currentProfile) {
          profiles.push(currentProfile)
        }
        currentProfile = {}
        continue
      }

      if (currentProfile) {
        if (line.startsWith('URL:')) {
          currentProfile.url = line.replace('URL:', '').trim()
        } else if (line.startsWith('Email:')) {
          currentProfile.email = line.replace('Email:', '').trim()
        } else if (line.startsWith('Nome de Usuário:')) {
          currentProfile.username = line.replace('Nome de Usuário:', '').trim()
        } else if (line.startsWith('Nome de Exibição:')) {
          currentProfile.name = line.replace('Nome de Exibição:', '').trim()
        } else if (line.startsWith('Foto/Avatar:')) {
          currentProfile.avatar = line.replace('Foto/Avatar:', '').trim()
        } else if (line.startsWith('Seguidores:')) {
          currentProfile.followers = line.replace('Seguidores:', '').trim()
        } else if (line.startsWith('Curtidas:')) {
          currentProfile.likes = line.replace('Curtidas:', '').trim()
        } else if (line.startsWith('Verificado:')) {
          currentProfile.verified = line.replace('Verificado:', '').trim() === 'SIM'
        }

        if (line.startsWith('━━')) {
          if (currentProfile && Object.keys(currentProfile).length > 0) {
            profiles.push(currentProfile)
            currentProfile = null
          }
        }
      }
    }

    if (currentProfile && Object.keys(currentProfile).length > 0) {
      profiles.push(currentProfile)
    }

    // Filtrar apenas perfis que correspondem a contas não reservadas
    const filteredProfiles = profiles.filter(profile => {
      const matchingAccount = accountData.find((acc: any) => 
        (profile.email && acc.email?.toLowerCase() === profile.email?.toLowerCase()) ||
        (profile.url && acc.url && acc.url.toLowerCase() === profile.url.toLowerCase()) ||
        (profile.name && acc.name?.toLowerCase() === profile.name?.toLowerCase())
      )
      return !!matchingAccount
    })

    // Buscar contas correspondentes
    const fullProfiles = filteredProfiles.map(profile => {
      const account = accountData.find((acc: any) => 
        (profile.email && acc.email?.toLowerCase() === profile.email?.toLowerCase()) ||
        (profile.url && acc.url && acc.url.toLowerCase() === profile.url.toLowerCase()) ||
        (profile.name && acc.name?.toLowerCase() === profile.name?.toLowerCase())
      )

      // Garantir HTTPS no avatar
      let avatarUrl = profile.avatar || ''
      if (avatarUrl && avatarUrl.startsWith('http://')) {
        avatarUrl = avatarUrl.replace('http://', 'https://')
      }

      return {
        ...profile,
        email: profile.email || account?.email || '',
        password: account?.password || '',
        name: profile.name || account?.name || profile.username || '',
        displayName: profile.name || account?.name || '',
        avatar: avatarUrl,
        bio: '',
        sequence: 0
      }
    })

    return NextResponse.json({ profiles: fullProfiles })
  } catch (error: any) {
    console.error('Erro ao carregar histórico:', error)
    return NextResponse.json(
      { error: `Erro ao carregar histórico: ${error.message}` },
      { status: 500 }
    )
  }
}
