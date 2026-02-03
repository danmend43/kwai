import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Dados das contas (mesmo do page.tsx)
const accountData = [
  { email: 'sonicrockeiro@gmail.com', password: 'kwai202022', name: 'sonicrockeiro', followers: '4.5K', verified: true },
  { email: 'd9161258@gmail.com', password: 'kwai202022', name: 'denos', followers: '3.1K', verified: true },
  { email: 'ttailss488@gmail.com', password: 'kwai202022', name: 'Ttailss', followers: '3.3K', verified: true },
  { email: 'crafa1387@gmail.com', password: 'kwai202022', name: 'crafa', followers: '3.1K', verified: true },
  { email: 'd60025523@gmail.com', password: 'kwai202022', name: 'daniel', followers: '3.4K', verified: true },
  { email: 'animationiajt@gmail.com', password: 'kwai202022', name: 'leoedit', followers: '6.5K', verified: true },
  { email: 'spideria63@gmail.com', password: 'kwai202022', name: 'spideria', followers: '3.3K', verified: true },
  { email: 'spider776m@gmail.com', password: 'kwai202022', name: 'Spiderman', followers: '3.4K', verified: true },
  { email: 'sonicia786@gmail.com', password: 'kwai202022', name: 'sonicia', followers: '3.3K', verified: true },
  { email: 'pokemonia72@gmail.com', password: 'kwai202022', name: 'Pokemonia', followers: '3.4K', verified: true },
  { email: 's40382900@gmail.com', password: 'kwai202022', name: 'Sonics4', followers: '3.3K', verified: true },
  { email: 'danielmendggmax@gmail.com', password: 'kwai202022', name: 'danielmend', followers: '3.2K', verified: true },
  { email: 'ssss01082088@gmail.com', password: 'kwai202022', name: 'subra', followers: '2.5K', verified: true },
  { email: 'ssss01082090@gmail.com', password: 'kwai202022', name: 'olv', followers: '2.5K', verified: true },
  { email: 'imran9999190@gmail.com', password: 'kwai202022', name: 'vitt', followers: '2.3K', verified: true },
  { email: 'head6262183@gmail.com', password: 'kwai202022', name: 'hawk', followers: '2.4K', verified: true },
  { email: 'mukta122040@gmail.com', password: 'kwai202022', name: 'myclerobert752', followers: '2.5K', verified: true },
  { email: 'mukta122041@gmail.com', password: 'kwai202022', name: 'mecst', followers: '2.2K', verified: true },
  { email: 'azim122040@gmail.com', password: 'kwai202022', name: 'ellen', followers: '2.4K', verified: true },
  { email: 'farabifk5555@gmail.com', password: 'kwai202022', name: 'farabi', followers: '2.4K', verified: true },
  { email: 'skfarukyt2524@gmail.com', password: 'kwai202022', name: 'faruk', followers: '1.8K', verified: true },
  { email: 'milonahmedkobir59@gmail.com', password: 'kwai202022', name: 'milon', followers: '1.8K', verified: true },
  { email: 'milonahmedkalam5@gmail.com', password: 'kwai202022', name: 'kalam', followers: '2.1K', verified: true },
  { email: 'tamimahmedsj21@gmail.com', password: 'kwai202022', name: 'tamim', followers: '1.9K', verified: true },
  { email: 'foysalahmedgoal18@gmail.com', password: 'kwai202022', name: 'foysal', followers: '2K', verified: true },
  { email: 'ranaahmedshuvo59@gmail.com', password: 'kwai202022', name: 'Rana', followers: '2K', verified: true },
  { email: 'emonahmedbappi44@gmail.com', password: 'kwai202022', name: 'Emon', followers: '2.1K', verified: true },
  { email: 'tamimahmednaim92@gmail.com', password: 'kwai202022', name: 'Naim', followers: '1.9K', verified: true },
  { email: 'ranaahmednaim@gmail.com', password: 'kwai202022', name: 'tyla', followers: '1.8K', verified: true },
  { email: 'firozaheadmasud@gmail.com', password: 'kwai202022', name: 'Firoz', followers: '1.9K', verified: true },
  { email: 'tamimahmedmahim5@gmail.com', password: 'kwai202022', name: 'med77', followers: '2K', verified: true },
  { email: 'sabbirahmedmafuz01@gmail.com', password: 'kwai202022', name: 'SABRI', followers: '1.8K', verified: true },
  { email: 'bajiyahmedshuvo@gmail.com', password: 'kwai202022', name: 'Bajiy', followers: '2K', verified: true },
  { email: 'bajiyahmedbappi@gmail.com', password: 'kwai202022', name: 'Bappi', followers: '1.8K', verified: true },
  { email: 'lemonahmedhcjyd@gmail.com', password: 'kwai202022', name: 'Lemon', followers: '2.2K', verified: true },
  { email: 'kingestonedmond@gmail.com', password: 'kwai202022', name: 'edmond', followers: '2K', verified: true },
  { email: 'brooklynnlaura99@gmail.com', password: 'kwai202022', name: 'laura', followers: '1.8K', verified: true },
  { email: 'maevparkinson@gmail.com', password: 'kwai202022', name: 'Maev', followers: '1.8K', verified: true },
  { email: 'albertocalvinzion@gmail.com', password: 'kwai202022', name: 'Zion', followers: '2K', verified: true },
  { email: 'ssss01082089@gmail.com', password: 'kwai202022', name: 'lilia', followers: '1.7K', verified: true },
  { email: 'rima122040@gmail.com', password: 'kwai202022', name: 'myclerobert', followers: '1.7K', verified: true },
  { email: 'nicksantos9615@gmail.com', password: 'kwai202022', name: 'Nick Santos', followers: '1.1K', verified: true },
  { email: 'mkzimsantsnder@gmail.com', password: 'kwai202022', name: 'Mkzim Santsnder', followers: '1.2K', verified: true },
  { email: 'mnvcwmhe927829@gmail.com', password: 'kwai202022', name: 'Jansen Floor', followers: '1.1K', verified: true },
  { email: 'mnvxsawri75432@gmail.com', password: 'kwai202022', name: 'Floor Jansen', followers: '1.1K', verified: true },
  { email: 'dhcxbvxy@gmail.com', password: 'kwai202022', name: 'Bvxy Dhcx', followers: '1.1K', verified: true },
  { email: 'gsfvxkvgkb@gmail.com', password: 'kwai202022', name: 'Gsfvx Kvgkb', followers: '1.2K', verified: true },
  { email: 'anbxdmbcyf@gmail.com', password: 'kwai202022', name: 'Mbcyf Anbxd', followers: '1.1K', verified: true },
  { email: 'bvxfssiyfkbc@gmail.com', password: 'kwai202022', name: 'Bvxfss Iyfkbc', followers: '1.1K', verified: true },
  { email: 'gjjczfmbcjh@gmail.com', password: 'kwai202022', name: 'Mbcjh Gjjczf', followers: '1.2K', verified: true },
  { email: 'jvjnsshwmvs@gmail.com', password: 'kwai202022', name: 'Jvjnss Hwmvs', followers: '791', verified: true },
  { email: 'ujvksnhkvs@gmail.com', password: 'kwai202022', name: 'Nhkvs Ujvks', followers: '1.2K', verified: true },
  { email: 'ifeel314@ponp.be', password: 'kwai202022', name: 'dert', followers: '1.3K', verified: false },
  { email: 'diplievow237@fuwamofu.com', password: 'kwai202022', name: 'regis', followers: '1K', verified: false },
  { email: 'piewas285@instaddr.uk', password: 'kwai202022', name: 'kelly', followers: '856', verified: false },
  { email: 'rugmudpep@svk.jp', password: 'kwai202022', name: 'lorena', followers: '1.2K', verified: false },
  { email: 'hipohdig@fuwamofu.com', password: 'kwai202022', name: 'kaik', followers: '1.3K', verified: false },
  { email: 'ourwoonow@owleyes.ch', password: 'kwai202022', name: 'marc', followers: '1.1K', verified: false },
  { email: 'gumhimlap@nanana.uk', password: 'kwai202022', name: 'veig', followers: '1.1K', verified: false },
  { email: 'rubuse75@instaddr.win', password: 'kwai202022', name: 'xeig', followers: '1.2K', verified: false },
  { email: 'captagbee@risu.be', password: 'kwai202022', name: 'sand', followers: '1.2K', verified: false },
  { email: 'gofaraim@ponp.be', password: 'kwai202022', name: 'gelio', followers: '1.2K', verified: false },
  { email: 'lierawfog@merry.pink', password: 'kwai202022', name: 'lira', followers: '1.1K', verified: false },
  { email: 'newjobrot@f5.si', password: 'kwai202022', name: 'july', followers: '1.3K', verified: false },
  { email: 'bugsue337@svk.jp', password: 'kwai202022', name: 'rena', followers: '1.2K', verified: false },
  { email: 'viaplyshe@exdonuts.com', password: 'kwai202022', name: 'nando', followers: '1.2K', verified: false },
  { email: 'mopnotrot@meruado.uk', password: 'kwai202022', name: 'ludds', followers: '1.1K', verified: false },
]

// GET é público para permitir acesso do catálogo público
export async function GET(request: NextRequest) {
  // GET é público - não requer autenticação
  try {
    const historyDir = path.join(process.cwd(), 'public', 'history')
    
    if (!existsSync(historyDir)) {
      return NextResponse.json({ profiles: [] })
    }

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

      // Converter dados do JSON para formato de ProfileData
      const profiles = jsonData.map((item: any) => {
        const account = accountData.find((acc: any) => 
          acc.email?.toLowerCase() === item.email?.toLowerCase() ||
          acc.name?.toLowerCase() === item.name?.toLowerCase()
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

    // Buscar contas correspondentes
    const fullProfiles = profiles.map(profile => {
      const account = accountData.find((acc: any) => 
        acc.email?.toLowerCase() === profile.email?.toLowerCase() ||
        acc.name?.toLowerCase() === profile.name?.toLowerCase()
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
