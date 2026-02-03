import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const accountsFilePath = path.join(process.cwd(), 'public', 'accounts-data.json')

// Carregar contas (GET é público para permitir acesso do catálogo público)
export async function GET(request: NextRequest) {
  // GET é público - não requer autenticação
  try {
    if (!existsSync(accountsFilePath)) {
      return NextResponse.json({ accounts: [] })
    }

    const content = await readFile(accountsFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    return NextResponse.json({ accounts: data.accounts || [] })
  } catch (error: any) {
    console.error('Erro ao carregar contas:', error)
    return NextResponse.json(
      { error: `Erro ao carregar contas: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar contas
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { accounts } = await request.json()

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const accountsDir = path.dirname(accountsFilePath)
    if (!existsSync(accountsDir)) {
      await mkdir(accountsDir, { recursive: true })
    }

    const data = {
      accounts,
      lastUpdated: new Date().toISOString()
    }

    await writeFile(accountsFilePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({ 
      success: true, 
      message: 'Contas salvas com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao salvar contas:', error)
    return NextResponse.json(
      { error: `Erro ao salvar contas: ${error.message}` },
      { status: 500 }
    )
  }
}

