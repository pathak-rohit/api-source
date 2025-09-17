import { NextResponse } from 'next/server'

const PROXY_TOKEN = process.env.PROXY_TOKEN || ''
const ALLOWED_TOKENS = (process.env.ALLOWED_TOKENS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function authorize(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  // For early development: enforce shared token if configured.
  const headers = new Headers()
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Key')
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const xkey = req.headers.get('x-proxy-key') || ''

  const tokens = [PROXY_TOKEN, ...ALLOWED_TOKENS].filter(Boolean)
  if (tokens.length === 0) {
    return { ok: true }
  }
  const provided = xkey || bearer
  if (!provided || !tokens.includes(provided)) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) }
  }
  return { ok: true }
}

export function withCors(req: Request, headers = new Headers()) {
  const originHeader = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('origin') || ''
  const allow = originHeader.includes('*') ? '*' : (originHeader.includes(origin) ? origin : 'null')
  headers.set('Access-Control-Allow-Origin', allow)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Key')
  headers.set('Vary', 'Origin')
  return headers
}

