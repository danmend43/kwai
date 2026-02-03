import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Função para validar se um número é válido (não é 0, vazio ou N/A)
function isValidNumber(value: string | number): boolean {
  if (!value) return false
  const str = String(value).trim().toUpperCase()
  if (str === '' || str === 'N/A' || str === '0' || str === 'NULL' || str === 'UNDEFINED') return false
  const num = parseInt(str.replace(/[^\d]/g, ''))
  return num > 0
}

// Função para normalizar número (remove pontos, vírgulas, mas mantém K/M/B)
function normalizeNumber(value: string): string {
  if (!value) return ''
  let normalized = value.trim()
  
  // Se tem K, M, B no final, manter
  const hasSuffix = /[kmbKM]$/i.test(normalized)
  const suffix = hasSuffix ? normalized.slice(-1).toUpperCase() : ''
  const numberPart = hasSuffix ? normalized.slice(0, -1) : normalized
  
  // Remover pontos e vírgulas do número, mas manter o número
  const cleanNumber = numberPart.replace(/[^\d]/g, '')
  
  return cleanNumber + suffix
}

// Função para esperar (delay)
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Função principal de extração
async function extractProfileData(url: string, retryCount: number = 0): Promise<any> {
  const MAX_RETRIES = 5
  const DELAY_BETWEEN_RETRIES = 3000 // 3 segundos entre tentativas
  
  try {
    // Normalizar URL - suportar múltiplos formatos
    let normalizedUrl = url.trim()
    
    // Remover espaços e garantir que tem protocolo
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    // Se já for kwai-video.com ou k.kwai.com com formato completo, manter como está
    if (normalizedUrl.includes('kwai-video.com/u/@') || normalizedUrl.includes('k.kwai.com/u/@')) {
      // Já está no formato correto, só garantir que tem https
      if (!normalizedUrl.startsWith('https://')) {
        normalizedUrl = normalizedUrl.replace(/^http:\/\//, 'https://')
      }
      console.log(`URL já está no formato correto: ${normalizedUrl}`)
      // Continuar com a URL como está
    } else if (normalizedUrl.includes('www.kwai.com')) {
      // Converter www.kwai.com para k.kwai.com
      // Extrair username de qualquer formato
      let username = ''
      
      // Tentar extrair de @username
      const usernameMatch1 = normalizedUrl.match(/@([^\/\?&#]+)/)
      if (usernameMatch1) {
        username = usernameMatch1[1]
      } else {
        // Tentar extrair de /@username ou /username
        const usernameMatch2 = normalizedUrl.match(/\/(?:u\/)?@?([^\/\?&#]+)/)
        if (usernameMatch2) {
          username = usernameMatch2[1].replace('@', '')
        }
      }
      
      if (username) {
        normalizedUrl = `https://k.kwai.com/u/@${username}`
        console.log(`URL normalizada de ${url} para ${normalizedUrl}`)
      } else {
        console.warn(`Não foi possível extrair username de: ${normalizedUrl}`)
      }
    } else if (normalizedUrl.includes('k.kwai.com') && !normalizedUrl.includes('/u/@')) {
      // Garantir formato correto se já for k.kwai.com mas sem /u/
      const usernameMatch = normalizedUrl.match(/@([^\/\?&#]+)/)
      if (usernameMatch) {
        normalizedUrl = `https://k.kwai.com/u/@${usernameMatch[1]}`
        console.log(`URL ajustada para formato completo: ${normalizedUrl}`)
      }
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.kwai.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-site'
    }

    // Aguardar antes de fazer requisição (dar tempo para rede)
    if (retryCount > 0) {
      console.log(`[${normalizedUrl}] Tentativa ${retryCount + 1}/${MAX_RETRIES} - Aguardando ${DELAY_BETWEEN_RETRIES}ms...`)
      await sleep(DELAY_BETWEEN_RETRIES)
    }

    // Fazer requisição com timeout maior
    const response = await axios.get(normalizedUrl, { 
      headers, 
      timeout: 20000, // 20 segundos
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500 // Aceitar até 4xx para ver o que retorna
      }
    })
    
    // Verificar se a resposta foi válida
    if (response.status >= 400) {
      console.log(`[${normalizedUrl}] Status HTTP: ${response.status}`)
      throw new Error(`Status HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Aguardar um pouco após receber resposta para garantir que HTML foi processado
    await sleep(1000)
    
    const $ = cheerio.load(response.data)
    const html = response.data
    
    // Debug: Salvar HTML parcial em caso de erro (primeiros 5000 caracteres)
    if (retryCount === MAX_RETRIES - 1) {
      console.log(`[${normalizedUrl}] HTML Sample (first 2000 chars):`, html.substring(0, 2000))
    }

    const profileData: any = {
      username: '',
      displayName: '',
      avatar: '',
      followers: '',
      likes: '',
      bio: '',
      verified: false
    }

    // Extrair username da URL
    const usernameMatch = normalizedUrl.match(/@([^\/\?]+)/)
    if (usernameMatch) {
      profileData.username = usernameMatch[1]
    }

    // ESTRATÉGIA 1: Meta Tags Open Graph
    profileData.displayName = $('meta[property="og:title"]').attr('content') || ''
    let avatarUrl = $('meta[property="og:image"]').attr('content') || ''
    // Garantir HTTPS
    if (avatarUrl && avatarUrl.startsWith('http://')) {
      avatarUrl = avatarUrl.replace('http://', 'https://')
    }
    profileData.avatar = avatarUrl
    const metaDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''
    profileData.bio = metaDescription

    console.log(`[${profileData.username}] Tentativa ${retryCount + 1} - Iniciando extração...`)

    // ESTRATÉGIA 2: Extrair da meta description (formato: "44988 Curtidas. 4815 Seguidores.")
    if (metaDescription) {
      console.log(`[${profileData.username}] Meta Description:`, metaDescription.substring(0, 200))
      
      // Padrões mais flexíveis para meta description
      const descLikesPatterns = [
        /(\d+[\d\.\,]*)\s*Curtidas/i,
        /Curtidas[:\s\.]*(\d+[\d\.\,]*)/i,
        /(\d+[\d\.\,]*)\s*likes/i,
        /likes[:\s\.]*(\d+[\d\.\,]*)/i,
        /(\d+[\d\.\,]*)\s*Like/i
      ]
      
      for (const pattern of descLikesPatterns) {
        const match = metaDescription.match(pattern)
        if (match && isValidNumber(match[1])) {
          profileData.likes = normalizeNumber(match[1])
          console.log(`[${profileData.username}] ✅ Likes da meta description:`, profileData.likes)
          break
        }
      }
      
      const descFollowersPatterns = [
        /(\d+[\d\.\,]*)\s*Seguidores/i,
        /Seguidores[:\s\.]*(\d+[\d\.\,]*)/i,
        /(\d+[\d\.\,]*)\s*followers/i,
        /followers[:\s\.]*(\d+[\d\.\,]*)/i,
        /(\d+[\d\.\,]*)\s*Follower/i,
        /(\d+[\d\.\,]*)\s*fans/i,
        /fans[:\s\.]*(\d+[\d\.\,]*)/i
      ]
      
      for (const pattern of descFollowersPatterns) {
        const match = metaDescription.match(pattern)
        if (match && isValidNumber(match[1])) {
          profileData.followers = normalizeNumber(match[1])
          console.log(`[${profileData.username}] ✅ Followers da meta description:`, profileData.followers)
          break
        }
      }
    }

    // ESTRATÉGIA 3: Buscar em todo o texto da página
    const pageText = $.text()
    const fullText = pageText + ' ' + metaDescription + ' ' + html

    // Padrões mais flexíveis para seguidores
    const followersPatterns = [
      /(\d+[\d\.\,]*[kKmM]?)\s*Seguidores/i,
      /Seguidores[:\s\.]*(\d+[\d\.\,]*[kKmM]?)/i,
      /(\d+[\d\.\,]*[kKmM]?)\s*(?:seguidores|followers|fãs|fans)/i,
      /(?:seguidores|followers|fãs|fans)[:\s\.]*(\d+[\d\.\,]*[kKmM]?)/i,
      /(\d+[\d\.\,]*[kKmM]?)\s*follower/i,
      /(\d+[\d\.\,]*[kKmM]?)\s*fan/i,
      /"followers"[:\s]*"(\d+[kKmM]?)"/i,
      /'followers'[:\s]*'(\d+[kKmM]?)'/i,
    ]
    
    if (!isValidNumber(profileData.followers)) {
      for (const pattern of followersPatterns) {
        const matches = fullText.match(pattern)
        if (matches && matches[1] && isValidNumber(matches[1])) {
          profileData.followers = normalizeNumber(matches[1])
          console.log(`[${profileData.username}] ✅ Followers encontrado no texto:`, profileData.followers)
          break
        }
      }
    }
    
    // Padrões mais flexíveis para curtidas
    const likesPatterns = [
      /(\d+[\d\.\,]*[kKmM]?)\s*Curtidas/i,
      /Curtidas[:\s\.]*(\d+[\d\.\,]*[kKmM]?)/i,
      /(\d+[\d\.\,]*[kKmM]?)\s*(?:curtidas|likes|liked)/i,
      /(?:curtidas|likes|liked)[:\s\.]*(\d+[\d\.\,]*[kKmM]?)/i,
      /(\d+[\d\.\,]*[kKmM]?)\s*like/i,
      /"likes"[:\s]*"(\d+[kKmM]?)"/i,
      /'likes'[:\s]*'(\d+[kKmM]?)'/i,
      /"likeCount"[:\s]*"(\d+[kKmM]?)"/i,
      /"totalLikes"[:\s]*"(\d+[kKmM]?)"/i,
    ]
    
    if (!isValidNumber(profileData.likes)) {
      for (const pattern of likesPatterns) {
        const matches = fullText.match(pattern)
        if (matches && matches[1] && isValidNumber(matches[1])) {
          profileData.likes = normalizeNumber(matches[1])
          console.log(`[${profileData.username}] ✅ Likes encontrado no texto:`, profileData.likes)
          break
        }
      }
    }

    // ESTRATÉGIA 4: Buscar em scripts JavaScript (JSON embutido)
    const scripts = $('script').toArray()
    let allScriptContent = ''
    
    for (const script of scripts) {
      const scriptContent = $(script).html() || ''
      allScriptContent += scriptContent + '\n'
      
      // Buscar JSON patterns
      const jsonPatterns = [
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
        /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]+?});/,
        /window\.__NUXT__\s*=\s*({[\s\S]+?});/,
        /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?});/,
        /var\s+__USER__\s*=\s*({[\s\S]+?});/,
        /"user"\s*:\s*({[\s\S]+?})/,
        /"profile"\s*:\s*({[\s\S]+?})/,
        /window\.initialProps\s*=\s*({[\s\S]+?});/,
        /window\.pageProps\s*=\s*({[\s\S]+?});/,
        /\{"user"[^}]+\}/,
        /user["\']?\s*[:=]\s*(\{[^}]+\})/,
      ]

      for (const pattern of jsonPatterns) {
        const jsonMatches = scriptContent.match(pattern)
        if (jsonMatches) {
          try {
            let data: any
            const jsonStr = jsonMatches[1].trim()
            
            if (jsonStr.startsWith('{')) {
              try {
                data = JSON.parse(jsonStr)
              } catch {
                const fullMatch = scriptContent.match(/\{[^{}]*"user"[^{}]*\}/)
                if (fullMatch) {
                  try {
                    data = JSON.parse(fullMatch[0])
                  } catch {}
                }
              }
            }

            if (data) {
              const userData = data.user || data.profile || data.data?.user || data.data?.profile || 
                              data.result?.user || data.result?.profile || data.content?.user ||
                              data.initialState?.user || data.pageProps?.user || data
              
              if (userData && typeof userData === 'object') {
                // Extrair followers com validação
                const followerCandidates = [
                  userData.followerCount, userData.followersCount, userData.followers,
                  userData.fanCount, userData.fan_count, userData.fans,
                  userData.totalFollowers, userData.follower_count
                ]
                
                for (const candidate of followerCandidates) {
                  if (candidate !== undefined && candidate !== null && isValidNumber(String(candidate))) {
                    profileData.followers = normalizeNumber(String(candidate))
                    console.log(`[${profileData.username}] ✅ Followers do JSON:`, profileData.followers)
                    break
                  }
                }

                // Extrair likes com validação
                const likeCandidates = [
                  userData.likeCount, userData.totalLikes, userData.likes,
                  userData.receivedLikeCount, userData.like_count, userData.total_likes
                ]
                
                for (const candidate of likeCandidates) {
                  if (candidate !== undefined && candidate !== null && isValidNumber(String(candidate))) {
                    profileData.likes = normalizeNumber(String(candidate))
                    console.log(`[${profileData.username}] ✅ Likes do JSON:`, profileData.likes)
                    break
                  }
                }

                let avatarFromJson = profileData.avatar || userData.avatar || userData.avatarUrl || 
                                   userData.profilePic || userData.headUrl || userData.head ||
                                   userData.profile_image || userData.image || userData.picture || ''
                // Garantir HTTPS
                if (avatarFromJson && avatarFromJson.startsWith('http://')) {
                  avatarFromJson = avatarFromJson.replace('http://', 'https://')
                }
                profileData.avatar = avatarFromJson
                
                profileData.displayName = profileData.displayName || userData.nickname || userData.name || 
                                          userData.displayName || userData.userName || userData.username ||
                                          userData.title || ''
                
                profileData.bio = profileData.bio || userData.signature || userData.description || 
                                  userData.bio || userData.about || userData.intro || ''
                
                profileData.verified = profileData.verified || userData.verified || userData.isVerified || userData.verified_status || false
                
                if (!profileData.username && userData.uniqueId) {
                  profileData.username = userData.uniqueId.replace('@', '')
                } else if (!profileData.username && userData.username) {
                  profileData.username = userData.username.replace('@', '')
                }
              }
            }
          } catch (e) {
            // Continuar tentando
          }
        }
      }
    }

    // ESTRATÉGIA 5: Buscar padrões específicos do Kwai em scripts
    const kwaiPatterns = {
      followers: [
        /["']followerCount["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /["']followers["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /["']fanCount["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /followerCount["']?\s*[:=]\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /followers["']?\s*[:=]\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /fanCount["']?\s*[:=]\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /(\d+[\.,]?\d*[kKmMbB]?)\s*follower/i,
        /(\d+[\.,]?\d*[kKmMbB]?)\s*fan/i,
      ],
      likes: [
        /["']likeCount["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /["']totalLikes["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /["']receivedLikeCount["']\s*:\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /likeCount["']?\s*[:=]\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /likes["']?\s*[:=]\s*["']?(\d+[\.,]?\d*[kKmMbB]?)/i,
        /(\d+[\.,]?\d*[kKmMbB]?)\s*like/i,
      ]
    }

    for (const [key, patterns] of Object.entries(kwaiPatterns)) {
      if (!isValidNumber(profileData[key])) {
        for (const pattern of patterns) {
          const matches = allScriptContent.match(pattern)
          if (matches && matches[1] && isValidNumber(matches[1])) {
            profileData[key] = normalizeNumber(matches[1])
            console.log(`[${profileData.username}] ✅ ${key} encontrado em script:`, profileData[key])
            break
          }
        }
      }
    }

    // ESTRATÉGIA 6: Buscar em atributos HTML e data-attributes
    if (!isValidNumber(profileData.followers)) {
      const followersSelectors = [
        '[class*="follower"]', '[class*="fan"]', '[data-followers]',
        '[data-follower-count]', '[data-fan-count]', '[id*="follower"]'
      ]
      
      for (const selector of followersSelectors) {
        const elements = $(selector)
        for (let i = 0; i < elements.length; i++) {
          const el = $(elements[i])
          const text = el.text() || el.attr('data-followers') || el.attr('data-follower-count') || ''
          const match = text.match(/(\d+[\d\.\,]*[kKmM]?)/i)
          if (match && isValidNumber(match[1])) {
            profileData.followers = normalizeNumber(match[1])
            console.log(`[${profileData.username}] ✅ Followers encontrado em elemento HTML:`, profileData.followers)
            break
          }
          if (profileData.followers) break
        }
        if (profileData.followers) break
      }
    }

    if (!isValidNumber(profileData.likes)) {
      const likesSelectors = [
        '[class*="like"]', '[data-likes]', '[data-like-count]',
        '[id*="like"]', '[class*="curtida"]'
      ]
      
      for (const selector of likesSelectors) {
        const elements = $(selector)
        for (let i = 0; i < elements.length; i++) {
          const el = $(elements[i])
          const text = el.text() || el.attr('data-likes') || el.attr('data-like-count') || ''
          const match = text.match(/(\d+[\d\.\,]*[kKmM]?)/i)
          if (match && isValidNumber(match[1])) {
            profileData.likes = normalizeNumber(match[1])
            console.log(`[${profileData.username}] ✅ Likes encontrado em elemento HTML:`, profileData.likes)
            break
          }
          if (profileData.likes) break
        }
        if (profileData.likes) break
      }
    }

    // ESTRATÉGIA 7: Buscar avatar
    if (!profileData.avatar || profileData.avatar === '') {
      const avatarSelectors = [
        'img[alt*="profile"]', 'img[alt*="avatar"]', '.avatar img',
        '.profile-img img', '[class*="avatar"] img', '[class*="profile"] img',
        'img[src*="avatar"]', 'img[src*="head"]', 'img[src*="profile"]'
      ]
      
      for (const selector of avatarSelectors) {
        const img = $(selector).first()
        let src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || ''
        if (src && src.includes('http')) {
          // Garantir que a URL seja HTTPS
          if (src.startsWith('http://')) {
            src = src.replace('http://', 'https://')
          }
          profileData.avatar = src
          break
        }
      }
    }

    // VALIDAÇÃO FINAL: Verificar se encontrou dados válidos
    const hasValidFollowers = isValidNumber(profileData.followers)
    const hasValidLikes = isValidNumber(profileData.likes)

    console.log(`[${profileData.username}] Resultado tentativa ${retryCount + 1}:`, {
      followers: hasValidFollowers ? profileData.followers : 'INVÁLIDO',
      likes: hasValidLikes ? profileData.likes : 'INVÁLIDO',
      displayName: profileData.displayName,
      metaDescription: metaDescription?.substring(0, 100) || 'N/A'
    })

    // Se não encontrou dados válidos, tentar uma última busca agressiva antes de desistir
    if ((!hasValidFollowers || !hasValidLikes)) {
      // Buscar TODOS os números na página e tentar identificar pelo contexto
      const allNumbers = fullText.match(/\d+[\d\.\,]*[kKmM]?/g) || []
      console.log(`[${profileData.username}] Números encontrados na página:`, allNumbers.slice(0, 20))
      
      // Procurar padrões específicos que podem estar escondidos
      const hiddenPatterns = [
        { pattern: /(\d+[\d\.\,]*)\s*followers?\s*/gi, type: 'followers' },
        { pattern: /(\d+[\d\.\,]*)\s*seguidores?\s*/gi, type: 'followers' },
        { pattern: /(\d+[\d\.\,]*)\s*likes?\s*/gi, type: 'likes' },
        { pattern: /(\d+[\d\.\,]*)\s*curtidas?\s*/gi, type: 'likes' },
        { pattern: /followers?[:\s=]+(\d+[\d\.\,]*)/gi, type: 'followers' },
        { pattern: /seguidores?[:\s=]+(\d+[\d\.\,]*)/gi, type: 'followers' },
        { pattern: /likes?[:\s=]+(\d+[\d\.\,]*)/gi, type: 'likes' },
        { pattern: /curtidas?[:\s=]+(\d+[\d\.\,]*)/gi, type: 'likes' },
      ]
      
      for (const { pattern, type } of hiddenPatterns) {
        const matches = Array.from(fullText.matchAll(pattern))
        for (const match of matches) {
          if (match[1] && isValidNumber(match[1])) {
            const value = normalizeNumber(match[1])
            if (type === 'followers' && !hasValidFollowers) {
              profileData.followers = value
              console.log(`[${profileData.username}] ✅ Followers encontrado em padrão oculto:`, value)
            } else if (type === 'likes' && !hasValidLikes) {
              profileData.likes = value
              console.log(`[${profileData.username}] ✅ Likes encontrado em padrão oculto:`, value)
            }
          }
        }
      }
    }

    const finalHasValidFollowers = isValidNumber(profileData.followers)
    const finalHasValidLikes = isValidNumber(profileData.likes)

    // Se não encontrou dados válidos e ainda tem tentativas, tentar novamente
    if ((!finalHasValidFollowers || !finalHasValidLikes) && retryCount < MAX_RETRIES) {
      console.log(`[${profileData.username}] ⚠️ Dados inválidos encontrados após todas estratégias. Tentando novamente...`)
      await sleep(2000) // Aguardar um pouco mais antes de tentar novamente
      return extractProfileData(url, retryCount + 1)
    }

    // Se ainda não tem dados válidos após todas tentativas, retornar vazio
    if (!hasValidFollowers) {
      profileData.followers = ''
    }
    if (!hasValidLikes) {
      profileData.likes = ''
    }

    return profileData
  } catch (error: any) {
    // Se deu erro e ainda tem tentativas, tentar novamente
    if (retryCount < MAX_RETRIES) {
      console.log(`[${url}] Erro na tentativa ${retryCount + 1}: ${error.message}. Tentando novamente...`)
      return extractProfileData(url, retryCount + 1)
    }
    
    throw error
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL é obrigatória' },
        { status: 400 }
      )
    }

    console.log(`\n🔍 Iniciando análise de: ${url}`)
    const profileData = await extractProfileData(url, 0)
    
    console.log(`✅ Análise concluída para: ${profileData.username}`)
    
    return NextResponse.json(profileData)
  } catch (error: any) {
    console.error('❌ Erro ao extrair dados:', error.message)
    return NextResponse.json(
      { error: `Erro ao analisar perfil: ${error.message}` },
      { status: 500 }
    )
  }
}
