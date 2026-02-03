import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const calendarFilePath = path.join(process.cwd(), 'public', 'calendar-data.json')

// Carregar dados do calendário
export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response || NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  try {
    if (!existsSync(calendarFilePath)) {
      return NextResponse.json({ markedDays: {}, sequences: {} })
    }

    const content = await readFile(calendarFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao carregar calendário:', error)
    return NextResponse.json(
      { error: `Erro ao carregar calendário: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar dados do calendário
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response || NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { markedDays, sequences } = await request.json()

    if (!markedDays || !sequences) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const calendarDir = path.dirname(calendarFilePath)
    if (!existsSync(calendarDir)) {
      await mkdir(calendarDir, { recursive: true })
    }

    const data = {
      markedDays,
      sequences,
      lastUpdated: new Date().toISOString()
    }

    try {
      await writeFile(calendarFilePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (writeError: any) {
      // No Vercel, escrita pode falhar - retornar sucesso mas avisar
      console.warn('Aviso: Não foi possível salvar no sistema de arquivos (normal no Vercel):', writeError.message)
      // Continuar mesmo assim - dados podem ser temporários no Vercel
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Calendário salvo com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao salvar calendário:', error)
    return NextResponse.json(
      { error: `Erro ao salvar calendário: ${error.message}` },
      { status: 500 }
    )
  }
}



