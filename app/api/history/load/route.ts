import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename é obrigatório' },
        { status: 400 }
      )
    }

    const historyDir = path.join(process.cwd(), 'public', 'history')
    const filePath = path.join(historyDir, filename)

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Extrair data do filename
    const dateMatch = filename.match(/historico_(\d{4})-(\d{2})-(\d{2})H(\d{2})-(\d{2})\.json/)
    let dateStr = filename
    if (dateMatch) {
      const [, year, month, day, hour, minute] = dateMatch
      dateStr = `${day}/${month}/${year} às ${hour}:${minute}`
    }

    // Calcular totais
    const totalFollowers = data.reduce((sum: number, p: any) => {
      const followers = parseInt(p.followers?.replace(/[^\d]/g, '') || '0')
      return sum + followers
    }, 0)

    const totalLikes = data.reduce((sum: number, p: any) => {
      const likes = parseInt(p.likes?.replace(/[^\d]/g, '') || '0')
      return sum + likes
    }, 0)

    return NextResponse.json({
      filename,
      date: dateStr,
      profiles: data,
      totalFollowers,
      totalLikes
    })
  } catch (error: any) {
    console.error('Erro ao carregar histórico:', error)
    return NextResponse.json(
      { error: `Erro ao carregar histórico: ${error.message}` },
      { status: 500 }
    )
  }
}



