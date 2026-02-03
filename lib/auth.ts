import { NextRequest, NextResponse } from 'next/server'

export function verifyAuth(request: NextRequest): { authenticated: boolean; response?: NextResponse } {
  try {
    const authToken = request.cookies.get('auth-token')
    
    if (authToken && authToken.value === 'authenticated') {
      return { authenticated: true }
    }
    
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Erro ao verificar autenticação:', error)
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Erro ao verificar autenticação' },
        { status: 500 }
      )
    }
  }
}
