import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const postingFilePath = path.join(process.cwd(), 'public', 'daily-posting.json')
const postingHistoryPath = path.join(process.cwd(), 'public', 'daily-posting-history.json')

// Função para obter a data atual no formato YYYY-MM-DD usando timezone local do servidor
function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }
  try {
    let postingData = {}
    let history = []

    if (existsSync(postingFilePath)) {
      const content = await readFile(postingFilePath, 'utf-8')
      const data = JSON.parse(content)
      postingData = data.postingData || {}
    }

    if (existsSync(postingHistoryPath)) {
      const historyContent = await readFile(postingHistoryPath, 'utf-8')
      const historyData = JSON.parse(historyContent)
      history = historyData.history || []
    }
    
    return NextResponse.json({ postingData, history })
  } catch (error: any) {
    console.error('Erro ao carregar postagens do dia:', error)
    return NextResponse.json(
      { error: `Erro ao carregar postagens: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { postingData, addToHistory, updateHistory, removeFromHistory } = await request.json()

    if (removeFromHistory !== undefined) {
      // Remover do histórico
      let history = []
      if (existsSync(postingHistoryPath)) {
        const historyContent = await readFile(postingHistoryPath, 'utf-8')
        const historyData = JSON.parse(historyContent)
        history = historyData.history || []
      }
      
      history = history.filter((item: any, index: number) => index !== removeFromHistory)
      
      const historyDir = path.dirname(postingHistoryPath)
      if (!existsSync(historyDir)) {
        await mkdir(historyDir, { recursive: true })
      }
      
      await writeFile(postingHistoryPath, JSON.stringify({ history }, null, 2), 'utf-8')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Item removido do histórico'
      })
    }

    let historyEntry = null

    // Carregar histórico uma vez
    let history = []
    if (existsSync(postingHistoryPath)) {
      const historyContent = await readFile(postingHistoryPath, 'utf-8')
      const historyData = JSON.parse(historyContent)
      history = historyData.history || []
    }

    // Processar updateHistory primeiro (se existir) - atualizar registro existente
    if (updateHistory) {
      const index = updateHistory.index
      if (index >= 0 && index < history.length) {
        // Atualizar registro existente
        history[index] = {
          ...history[index],
          groups: updateHistory.groups || history[index].groups || [],
          totalAccounts: updateHistory.totalAccounts || history[index].totalAccounts || 0,
          endTime: updateHistory.endTime || history[index].endTime
        }
        historyEntry = history[index]
      } else {
        // Tentar encontrar pela data
        const todayDate = getTodayDate()
        const existingIndex = history.findIndex((item: any) => item.date === todayDate)
        if (existingIndex >= 0) {
          history[existingIndex] = {
            ...history[existingIndex],
            groups: updateHistory.groups || history[existingIndex].groups || [],
            totalAccounts: updateHistory.totalAccounts || history[existingIndex].totalAccounts || 0,
            endTime: updateHistory.endTime || history[existingIndex].endTime
          }
          historyEntry = history[existingIndex]
        }
      }
      
      const historyDir = path.dirname(postingHistoryPath)
      if (!existsSync(historyDir)) {
        await mkdir(historyDir, { recursive: true })
      }
      
      await writeFile(postingHistoryPath, JSON.stringify({ history }, null, 2), 'utf-8')
    }
    // Processar addToHistory (se existir e não foi atualizado)
    else if (addToHistory) {
      // Sempre usar a data atual do servidor (timezone local) para evitar problemas
      const now = new Date()
      const todayDate = getTodayDate() // Formato YYYY-MM-DD baseado no timezone local
      
      // VERIFICAR se já existe histórico para hoje ANTES de criar novo
      const existingIndex = history.findIndex((item: any) => {
        if (!item.date) return false
        // Normalizar data do item (pode estar em formato ISO ou YYYY-MM-DD)
        const itemDateNormalized = item.date.includes('T') 
          ? item.date.split('T')[0] 
          : item.date.split(' ')[0] // Caso tenha hora sem T
        return itemDateNormalized === todayDate
      })
      
      if (existingIndex >= 0) {
        // ATUALIZAR histórico existente ao invés de criar novo
        const existing = history[existingIndex]
        const groups = [...(existing.groups || [])]
        const newGroup = addToHistory.groups?.[0] // Pegar o primeiro grupo do array
        if (newGroup && !groups.includes(newGroup)) {
          groups.push(newGroup)
        }
        
        history[existingIndex] = {
          ...existing,
          groups: groups,
          totalAccounts: (existing.totalAccounts || 0) + (addToHistory.totalAccounts || 0),
          endTime: addToHistory.endTime || existing.endTime
        }
        historyEntry = history[existingIndex]
      } else {
        // Criar novo histórico APENAS se não existe nenhum para hoje
        historyEntry = {
          date: todayDate, // Sempre usar data atual do servidor (timezone local)
          startTime: addToHistory.startTime || now.toISOString(),
          endTime: addToHistory.endTime || now.toISOString(),
          totalAccounts: addToHistory.totalAccounts || 0,
          groups: addToHistory.groups || []
        }
        
        history.unshift(historyEntry)
      }
      
      const historyDir = path.dirname(postingHistoryPath)
      if (!existsSync(historyDir)) {
        await mkdir(historyDir, { recursive: true })
      }
      
      await writeFile(postingHistoryPath, JSON.stringify({ history }, null, 2), 'utf-8')
    }

    // Processar postingData (se existir)
    if (postingData) {
      const postingDir = path.dirname(postingFilePath)
      if (!existsSync(postingDir)) {
        await mkdir(postingDir, { recursive: true })
      }

      const data = {
        postingData,
        lastUpdated: new Date().toISOString()
      }

      await writeFile(postingFilePath, JSON.stringify(data, null, 2), 'utf-8')
    }

    // Retornar resposta incluindo historyEntry se foi criado ou atualizado
    const response: any = { 
      success: true, 
      message: 'Dados salvos com sucesso'
    }
    
    if (historyEntry) {
      response.historyEntry = historyEntry
    }
    
    // Se foi atualização, retornar também o histórico completo
    if (updateHistory) {
      response.history = history
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Erro ao salvar postagens:', error)
    return NextResponse.json(
      { error: `Erro ao salvar postagens: ${error.message}` },
      { status: 500 }
    )
  }
}

