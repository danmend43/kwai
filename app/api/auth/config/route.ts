import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Valores padrão - usar variáveis de ambiente se disponíveis
const DEFAULT_USERNAME = process.env.AUTH_USERNAME || 'danmend'
const DEFAULT_PASSWORD = process.env.AUTH_PASSWORD || 'Zshakugan5@'

// Carregar configuração de autenticação
export async function GET(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  return NextResponse.json({ 
    username: DEFAULT_USERNAME,
    hasPassword: true
  })
}

// Atualizar configuração de autenticação (apenas retorna info, não salva nada)
export async function POST(request: NextRequest) {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return auth.response!
  }

  // Para simplificar, apenas retorna sucesso
  // As credenciais são gerenciadas via variáveis de ambiente no Vercel
  return NextResponse.json({ 
    success: true,
    message: 'Configurações são gerenciadas via variáveis de ambiente',
    username: DEFAULT_USERNAME
  })
}
