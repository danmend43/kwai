import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }
  try {
    const { data } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Criar pasta de histórico se não existir
    const historyDir = path.join(process.cwd(), 'public', 'history')
    if (!existsSync(historyDir)) {
      await mkdir(historyDir, { recursive: true })
    }

    // Gerar nome do arquivo com data e hora
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}H${hours}-${minutes}`
    const filename = `historico_${dateStr}.txt`
    const filepath = path.join(historyDir, filename)

    // Formatar dados para o arquivo
    let content = `═══════════════════════════════════════════════════════════\n`
    content += `HISTÓRICO DE EXECUÇÃO - KWAI PROFILE ANALYZER\n`
    content += `═══════════════════════════════════════════════════════════\n\n`
    content += `Data e Hora: ${now.toLocaleString('pt-BR')}\n`
    content += `Total de Perfis Analisados: ${data.length}\n\n`
    content += `═══════════════════════════════════════════════════════════\n\n`

    // Adicionar dados de cada perfil
    data.forEach((profile: any, index: number) => {
      content += `[${index + 1}] ${profile.name || profile.username || 'N/A'}\n`
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      content += `URL: ${profile.url}\n`
      content += `Email: ${profile.email || 'N/A'}\n`
      content += `Nome de Usuário: ${profile.username || 'N/A'}\n`
      content += `Nome de Exibição: ${profile.name || 'N/A'}\n`
      content += `Foto/Avatar: ${profile.avatar || 'N/A'}\n`
      content += `Seguidores: ${profile.followers || 'N/A'}\n`
      content += `Curtidas: ${profile.likes || 'N/A'}\n`
      content += `Verificado: ${profile.verified ? 'SIM' : 'NÃO'}\n`
      content += `\n`
    })

    content += `═══════════════════════════════════════════════════════════\n`
    content += `RESUMO ESTATÍSTICO\n`
    content += `═══════════════════════════════════════════════════════════\n\n`
    
    const totalFollowers = data.reduce((sum: number, p: any) => {
      const followers = parseInt(p.followers?.replace(/[^\d]/g, '') || '0')
      return sum + followers
    }, 0)
    
    const totalLikes = data.reduce((sum: number, p: any) => {
      const likes = parseInt(p.likes?.replace(/[^\d]/g, '') || '0')
      return sum + likes
    }, 0)
    
    const verifiedCount = data.filter((p: any) => p.verified).length

    content += `Total de Seguidores: ${totalFollowers.toLocaleString()}\n`
    content += `Total de Curtidas: ${totalLikes.toLocaleString()}\n`
    content += `Perfis Verificados: ${verifiedCount}/${data.length}\n`
    content += `\n`
    content += `═══════════════════════════════════════════════════════════\n`
    content += `Fim do Relatório\n`
    content += `═══════════════════════════════════════════════════════════\n`

    // Salvar arquivo de texto
    await writeFile(filepath, content, 'utf-8')

    // Também salvar em JSON para fácil leitura
    const jsonFilename = `historico_${dateStr}.json`
    const jsonFilepath = path.join(historyDir, jsonFilename)
    await writeFile(jsonFilepath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      filename: filename,
      jsonFilename: jsonFilename,
      message: `Histórico salvo em: ${filename}`
    })
  } catch (error: any) {
    console.error('Erro ao salvar histórico:', error)
    return NextResponse.json(
      { error: `Erro ao salvar histórico: ${error.message}` },
      { status: 500 }
    )
  }
}
