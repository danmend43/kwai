import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logout realizado com sucesso'
  })

  // Remover cookie de autenticação
  response.cookies.delete('auth-token')

  return response
}

