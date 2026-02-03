import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Credenciais simples - usar variáveis de ambiente ou valores padrão
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'danmend'
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'Zshakugan5@'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Verificar se username e password estão corretos
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      const response = NextResponse.json({ 
        success: true,
        message: 'Login realizado com sucesso'
      })

      // Definir cookie simples de autenticação
      response.cookies.set('auth-token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: '/',
      })

      return response
    } else {
      return NextResponse.json(
        { success: false, error: 'Usuário ou senha incorretos' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Erro ao fazer login:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login' },
      { status: 500 }
    )
  }
}
