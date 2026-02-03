import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-seguro-mude-em-producao'
const JWT_EXPIRES_IN = '7d'

export interface JWTPayload {
  username: string
  iat?: number
  exp?: number
}

export function generateToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}









