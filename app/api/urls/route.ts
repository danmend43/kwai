import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const urlsFilePath = path.join(process.cwd(), 'public', 'saved-urls.json')

// Carregar URLs salvas
export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }
  try {
    if (!existsSync(urlsFilePath)) {
      return NextResponse.json({ urls: [] })
    }

    const content = await readFile(urlsFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    return NextResponse.json({ urls: data.urls || [] })
  } catch (error: any) {
    console.error('Erro ao carregar URLs:', error)
    return NextResponse.json(
      { error: `Erro ao carregar URLs: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar URLs
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { urls } = await request.json()

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs inválidas' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const urlsDir = path.dirname(urlsFilePath)
    if (!existsSync(urlsDir)) {
      await mkdir(urlsDir, { recursive: true })
    }

    const data = {
      urls: urls,
      lastUpdated: new Date().toISOString()
    }

    await writeFile(urlsFilePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({ 
      success: true, 
      message: 'URLs salvas com sucesso',
      urls: urls.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar URLs:', error)
    return NextResponse.json(
      { error: `Erro ao salvar URLs: ${error.message}` },
      { status: 500 }
    )
  }
}



