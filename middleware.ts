import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acesso público à rota de login
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Permitir acesso público às rotas de catálogo (páginas)
  if (pathname.startsWith('/catalog')) {
    return NextResponse.next()
  }

  // Permitir acesso público aos arquivos HTML estáticos de catálogos
  if (pathname.startsWith('/catalogs/') && pathname.endsWith('.html')) {
    return NextResponse.next()
  }

  // Permitir rotas de autenticação (login, verify, logout) - todos os métodos
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }
  
  // Permitir OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Permitir acesso público ao GET de catalog-config (API usada pela página pública)
  if (pathname === '/api/catalog-config' && request.method === 'GET') {
    return NextResponse.next()
  }

  // Permitir acesso público ao GET de accounts (usado pela página de catálogo)
  if (pathname === '/api/accounts' && request.method === 'GET') {
    return NextResponse.next()
  }

  // Permitir acesso público ao GET de load-last-history (usado pela página de catálogo)
  if (pathname === '/api/load-last-history' && request.method === 'GET') {
    return NextResponse.next()
  }

  // Verificar se o usuário está autenticado (verificação simples)
  const authToken = request.cookies.get('auth-token')
  const isAuthenticated = authToken && authToken.value === 'authenticated'

  // Para rotas de API, deixar que cada rota verifique individualmente
  // (elas retornarão JSON de erro ao invés de redirecionar)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Para páginas, redirecionar para login se não autenticado
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - arquivos estáticos (imagens, HTML, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|catalogs/.*\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
