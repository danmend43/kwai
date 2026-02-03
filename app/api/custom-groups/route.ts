import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const customGroupsFilePath = path.join(process.cwd(), 'public', 'custom-groups.json')

// Estrutura: { "email": "nomeDoGrupo" }
// Grupos personalizados: { "nomeDoGrupo": ["email1", "email2", ...] }

// Carregar grupos personalizados
export async function GET(request: NextRequest) {
  try {
    if (!existsSync(customGroupsFilePath)) {
      return NextResponse.json({ 
        accountGroups: {}, // { "email": "nomeDoGrupo" }
        customGroups: {}, // { "nomeDoGrupo": ["email1", "email2"] }
        groupCovers: {} // { "groupName": "base64Image" }
      })
    }

    const content = await readFile(customGroupsFilePath, 'utf-8')
    const data = JSON.parse(content)
    
    return NextResponse.json({ 
      accountGroups: data.accountGroups || {},
      customGroups: data.customGroups || {},
      groupCovers: data.groupCovers || {}
    })
  } catch (error: any) {
    console.error('Erro ao carregar grupos personalizados:', error)
    return NextResponse.json(
      { error: `Erro ao carregar grupos: ${error.message}` },
      { status: 500 }
    )
  }
}

// Salvar grupos personalizados
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { accountGroups, customGroups, groupCovers } = await request.json()

    if (!accountGroups || typeof accountGroups !== 'object') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const customGroupsDir = path.dirname(customGroupsFilePath)
    if (!existsSync(customGroupsDir)) {
      await mkdir(customGroupsDir, { recursive: true })
    }

    const data = {
      accountGroups: accountGroups || {},
      customGroups: customGroups || {},
      groupCovers: groupCovers || {},
      lastUpdated: new Date().toISOString()
    }

    await writeFile(customGroupsFilePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({ 
      success: true, 
      message: 'Grupos personalizados salvos com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao salvar grupos personalizados:', error)
    return NextResponse.json(
      { error: `Erro ao salvar grupos: ${error.message}` },
      { status: 500 }
    )
  }
}

