import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const valoresFilePath = path.join(process.cwd(), 'public', 'valores-data.json')

// Carregar valores
export async function GET(request: NextRequest) {
  try {
    if (!existsSync(valoresFilePath)) {
      return NextResponse.json({ 
        valores: {},
        taxa: 15.98
      })
    }

    const content = await readFile(valoresFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    return NextResponse.json({ 
      valores: data.valores || {},
      taxa: data.taxa !== undefined ? data.taxa : 15.98
    })
  } catch (error: any) {
    console.error('Erro ao carregar valores:', error)
    return NextResponse.json(
      { error: `Erro ao carregar valores: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar valores
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { valores, taxa } = await request.json()

    if (!valores || typeof valores !== 'object') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const valoresDir = path.dirname(valoresFilePath)
    if (!existsSync(valoresDir)) {
      await mkdir(valoresDir, { recursive: true })
    }

    const data = {
      valores,
      taxa: taxa !== undefined ? taxa : 15.98,
      lastUpdated: new Date().toISOString()
    }

    await writeFile(valoresFilePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({ 
      success: true, 
      message: 'Valores salvos com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao salvar valores:', error)
    return NextResponse.json(
      { error: `Erro ao salvar valores: ${error.message}` },
      { status: 500 }
    )
  }
}

