import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Salvar capa do grupo na pasta img
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  try {
    const { imageBase64, groupName } = await request.json()

    if (!imageBase64 || !groupName) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Extrair o tipo de imagem e os dados
    const matches = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json(
        { error: 'Formato de imagem inválido' },
        { status: 400 }
      )
    }

    const imageType = matches[1] // jpeg, png, etc
    const imageData = matches[2] // dados base64

    // Criar diretório img se não existir
    const imgDir = path.join(process.cwd(), 'public', 'img')
    if (!existsSync(imgDir)) {
      await mkdir(imgDir, { recursive: true })
    }

    // Nome do arquivo: sanitizar o nome do grupo e adicionar timestamp
    const sanitizedGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const timestamp = Date.now()
    const filename = `group-cover-${sanitizedGroupName}-${timestamp}.${imageType}`
    const filePath = path.join(imgDir, filename)

    // Converter base64 para buffer e salvar
    const buffer = Buffer.from(imageData, 'base64')
    await writeFile(filePath, buffer)

    // Retornar o caminho relativo para acessar a imagem
    const imagePath = `/img/${filename}`

    return NextResponse.json({ 
      success: true, 
      imagePath: imagePath
    })
  } catch (error: any) {
    console.error('Erro ao salvar capa:', error)
    return NextResponse.json(
      { error: `Erro ao salvar capa: ${error.message}` },
      { status: 500 }
    )
  }
}

