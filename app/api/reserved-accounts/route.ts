import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const reservedAccountsFilePath = path.join(process.cwd(), 'public', 'reserved-accounts.txt')

interface AccountData {
  id?: string
  email: string
  password: string
  name?: string
  number?: string
  cel?: string
  url?: string
  note?: string
  hidden?: boolean
  reserved?: boolean
}

// Carregar contas reservadas
export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    if (!existsSync(reservedAccountsFilePath)) {
      return NextResponse.json({ accounts: [] })
    }

    const content = await readFile(reservedAccountsFilePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim() !== '')
    
    const accounts: AccountData[] = []
    lines.forEach(line => {
      const parts = line.split('|')
      if (parts.length >= 2) {
        accounts.push({
          email: parts[0]?.trim() || '',
          password: parts[1]?.trim() || '',
          name: parts[2]?.trim() || '',
          id: parts[3]?.trim() || '',
          cel: parts[4]?.trim() || '',
          note: parts[5]?.trim() || '',
          url: parts[6]?.trim() || '',
          reserved: true
        })
      }
    })
    
    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('Erro ao carregar contas reservadas:', error)
    return NextResponse.json(
      { error: `Erro ao carregar contas reservadas: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar contas reservadas
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
    const accountsDir = path.dirname(reservedAccountsFilePath)
    if (!existsSync(accountsDir)) {
      await mkdir(accountsDir, { recursive: true })
    }

    // Formatar contas para arquivo txt (separado por |)
    const lines = accounts.map((acc: AccountData) => {
      return [
        acc.email || '',
        acc.password || '',
        acc.name || '',
        acc.id || '',
        acc.cel || '',
        acc.note || '',
        acc.url || ''
      ].join('|')
    })

    const content = lines.join('\n') + '\n'

    await writeFile(reservedAccountsFilePath, content, 'utf-8')

    return NextResponse.json({ 
      success: true, 
      message: 'Contas reservadas salvas com sucesso',
      count: accounts.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar contas reservadas:', error)
    return NextResponse.json(
      { error: `Erro ao salvar contas reservadas: ${error.message}` },
      { status: 500 }
    )
  }
}

// Remover conta completamente do sistema
export async function DELETE(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // 1. Remover de reserved-accounts.txt
    if (existsSync(reservedAccountsFilePath)) {
      const content = await readFile(reservedAccountsFilePath, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim() !== '')
      
      const filteredLines = lines.filter(line => {
        const parts = line.split('|')
        const lineEmail = parts[0]?.trim().toLowerCase()
        return lineEmail !== email.toLowerCase()
      })
      
      if (filteredLines.length < lines.length) {
        const newContent = filteredLines.join('\n') + (filteredLines.length > 0 ? '\n' : '')
        await writeFile(reservedAccountsFilePath, newContent, 'utf-8')
      }
    }

    // 2. Remover de accounts-data.json
    const accountsFilePath = path.join(process.cwd(), 'public', 'accounts-data.json')
    if (existsSync(accountsFilePath)) {
      const accountsContent = await readFile(accountsFilePath, 'utf-8')
      const accountsData = JSON.parse(accountsContent)
      const accounts = accountsData.accounts || []
      
      const filteredAccounts = accounts.filter((acc: AccountData) => 
        (acc.email || '').toLowerCase() !== email.toLowerCase()
      )
      
      if (filteredAccounts.length < accounts.length) {
        // Reajustar IDs sequencialmente
        const reindexedAccounts = filteredAccounts.map((acc: AccountData, idx: number) => ({
          ...acc,
          id: String(idx + 1)
        }))
        
        const updatedData = {
          accounts: reindexedAccounts,
          lastUpdated: new Date().toISOString()
        }
        
        await writeFile(accountsFilePath, JSON.stringify(updatedData, null, 2), 'utf-8')
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Conta removida completamente do sistema',
      email
    })
  } catch (error: any) {
    console.error('Erro ao remover conta:', error)
    return NextResponse.json(
      { error: `Erro ao remover conta: ${error.message}` },
      { status: 500 }
    )
  }
}


