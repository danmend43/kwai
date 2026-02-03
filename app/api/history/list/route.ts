import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const historyDir = path.join(process.cwd(), 'public', 'history')
    
    if (!existsSync(historyDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = await readdir(historyDir)
    const jsonFiles = files
      .filter(file => file.startsWith('historico_') && file.endsWith('.json'))
      .map(filename => {
        // Extrair data do nome do arquivo: historico_2025-11-02H03-25.json
        const dateMatch = filename.match(/historico_(\d{4})-(\d{2})-(\d{2})H(\d{2})-(\d{2})\.json/)
        let dateStr = filename
        if (dateMatch) {
          const [, year, month, day, hour, minute] = dateMatch
          dateStr = `${day}/${month}/${year} ${hour}:${minute}`
        }
        
        return {
          filename,
          date: dateStr,
          fullPath: path.join(historyDir, filename)
        }
      })
      .sort()
      .reverse() // Mais recente primeiro

    return NextResponse.json({ files: jsonFiles })
  } catch (error: any) {
    console.error('Erro ao listar arquivos:', error)
    return NextResponse.json(
      { error: `Erro ao listar arquivos: ${error.message}` },
      { status: 500 }
    )
  }
}












