export interface Env {
  SILICONFLOW_API_KEY: string
}

const UPSTREAM = 'https://api.siliconflow.cn/v1'
const EMBED_MODEL = 'BAAI/bge-m3'
const ASR_MODEL = 'FunAudioLLM/SenseVoiceSmall'
const MAX_EMBED_BODY_CHARS = 1_000_000
const MAX_EMBED_ITEMS = 32
const MAX_EMBED_INPUT_CHARS = 8000
const MAX_AUDIO_BYTES = 15 * 1024 * 1024

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

function passUpstream(upstream: Response): Response {
  const headers = new Headers(CORS)
  const contentType = upstream.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  return new Response(upstream.body, { status: upstream.status, headers })
}

function requireKey(env: Env): string | Response {
  const key = env.SILICONFLOW_API_KEY?.trim()
  if (!key) return json({ error: { message: 'builtin_proxy_unconfigured' } }, 500)
  return key
}

function normalizeEmbedInput(raw: unknown): string | string[] | null {
  if (typeof raw === 'string') {
    const text = raw.trim().slice(0, MAX_EMBED_INPUT_CHARS)
    return text ? text : null
  }
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_EMBED_ITEMS) return null
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') return null
    const text = item.trim().slice(0, MAX_EMBED_INPUT_CHARS)
    if (!text) return null
    out.push(text)
  }
  return out
}

async function handleEmbeddings(request: Request, env: Env): Promise<Response> {
  const key = requireKey(env)
  if (typeof key !== 'string') return key

  const raw = await request.text()
  if (raw.length > MAX_EMBED_BODY_CHARS) {
    return json({ error: { message: 'payload_too_large' } }, 413)
  }

  let body: { input?: unknown }
  try {
    body = JSON.parse(raw) as { input?: unknown }
  } catch {
    return json({ error: { message: 'invalid_json' } }, 400)
  }

  const input = normalizeEmbedInput(body.input)
  if (!input) return json({ error: { message: 'invalid_input' } }, 400)

  const upstream = await fetch(`${UPSTREAM}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  })
  return passUpstream(upstream)
}

async function handleAsr(request: Request, env: Env): Promise<Response> {
  const key = requireKey(env)
  if (typeof key !== 'string') return key

  const declared = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) {
    return json({ error: { message: 'payload_too_large' } }, 413)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: { message: 'invalid_form' } }, 400)
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size < 1) {
    return json({ error: { message: 'missing_audio' } }, 400)
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return json({ error: { message: 'payload_too_large' } }, 413)
  }

  const out = new FormData()
  out.set('file', file, file.name || 'voice.webm')
  out.set('model', ASR_MODEL)

  const upstream = await fetch(`${UPSTREAM}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: out,
  })
  return passUpstream(upstream)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url = new URL(request.url)
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({ ok: true })
    }
    if (request.method !== 'POST') {
      return json({ error: { message: 'method_not_allowed' } }, 405)
    }
    if (url.pathname === '/v1/embeddings') return handleEmbeddings(request, env)
    if (url.pathname === '/v1/audio/transcriptions') return handleAsr(request, env)
    return json({ error: { message: 'not_found' } }, 404)
  },
}
