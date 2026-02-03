// Sistema de rate limiting simples em memória
// Em produção, considere usar Redis para múltiplos servidores

interface AttemptInfo {
  count: number
  lastAttempt: number
  blockedUntil?: number
}

const attempts = new Map<string, AttemptInfo>()

const MAX_ATTEMPTS = 5 // Máximo de tentativas
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const BLOCK_DURATION_MS = 30 * 60 * 1000 // Bloqueio por 30 minutos após exceder tentativas

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfter?: number } {
  const now = Date.now()
  const info = attempts.get(identifier) || { count: 0, lastAttempt: 0 }

  // Se está bloqueado, verificar se já pode tentar novamente
  if (info.blockedUntil && now < info.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter: Math.ceil((info.blockedUntil - now) / 1000) // em segundos
    }
  }

  // Se passou o tempo da janela, resetar contador
  if (now - info.lastAttempt > WINDOW_MS) {
    info.count = 0
    info.blockedUntil = undefined
  }

  // Se excedeu tentativas, bloquear
  if (info.count >= MAX_ATTEMPTS) {
    info.blockedUntil = now + BLOCK_DURATION_MS
    attempts.set(identifier, info)
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000)
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - info.count
  }
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now()
  const info = attempts.get(identifier) || { count: 0, lastAttempt: 0 }

  // Resetar se passou a janela de tempo
  if (now - info.lastAttempt > WINDOW_MS) {
    info.count = 0
  }

  info.count++
  info.lastAttempt = now

  attempts.set(identifier, info)
}

export function clearAttempts(identifier: string): void {
  attempts.delete(identifier)
}

// Limpar tentativas antigas periodicamente (prevenir vazamento de memória)
setInterval(() => {
  const now = Date.now()
  for (const [identifier, info] of Array.from(attempts.entries())) {
    // Remover se passou muito tempo e não está bloqueado
    if (!info.blockedUntil && now - info.lastAttempt > WINDOW_MS * 2) {
      attempts.delete(identifier)
    }
    // Remover bloqueios expirados
    else if (info.blockedUntil && now >= info.blockedUntil) {
      attempts.delete(identifier)
    }
  }
}, 60 * 1000) // Limpar a cada minuto


