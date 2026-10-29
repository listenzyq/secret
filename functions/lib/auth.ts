import { argon2id } from 'hash-wasm'

export interface Env {
  DB: D1Database
}

const SESSION_COOKIE = 'secret_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function validateUsername(username: string) { return USERNAME_PATTERN.test(username) }
export function validatePassword(password: string) { return password.length >= 12 && password.length <= 128 }
export function randomBytes(size: number) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return bytes }

export async function hashPassword(password: string, salt: Uint8Array) {
  return argon2id({ password, salt, parallelism: 1, iterations: 3, memorySize: 19456, hashLength: 32, outputType: 'encoded' })
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

export async function createSession(env: Env, userId: string) {
  const raw = bytesToBase64Url(randomBytes(32))
  const idHash = await sha256(raw)
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  await env.DB.prepare('INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(idHash, userId, expiresAt).run()
  return raw
}

export async function getSession(request: Request, env: Env) {
  const cookie = request.headers.get('Cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]
  if (!cookie) return null
  const idHash = await sha256(cookie)
  const row = await env.DB.prepare('SELECT sessions.user_id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id_hash = ? AND sessions.expires_at > ?').bind(idHash, Date.now()).first<{ user_id: string; username: string }>()
  return row ? { ...row, token: cookie } : null
}

export async function destroySession(request: Request, env: Env) {
  const session = await getSession(request, env)
  if (session) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(session.token)).run()
}

export async function loginRateLimited(request: Request, env: Env, username: string) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const key = await sha256(`${ip}:${username.toLowerCase()}`)
  const row = await env.DB.prepare('SELECT failures, window_started_at, blocked_until FROM login_attempts WHERE key = ?').bind(key).first<{ failures: number; window_started_at: number; blocked_until: number }>()
  const now = Date.now()
  if (!row) return { key, limited: false }
  if (row.blocked_until > now) return { key, limited: true }
  if (now - row.window_started_at > 15 * 60 * 1000) await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()
  return { key, limited: false }
}

export async function recordLoginFailure(env: Env, key: string) {
  const now = Date.now()
  await env.DB.prepare(`INSERT INTO login_attempts (key, failures, window_started_at, blocked_until)
    VALUES (?, 1, ?, 0)
    ON CONFLICT(key) DO UPDATE SET failures = failures + 1, blocked_until = CASE WHEN failures + 1 >= 5 THEN ? ELSE blocked_until END`).bind(key, now, now + 15 * 60 * 1000).run()
}

export async function clearLoginFailures(env: Env, key: string) { await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run() }

export function sessionCookie(value: string, maxAge = SESSION_TTL_SECONDS) { return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}` }
export function json(data: unknown, init: ResponseInit = {}) { return new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(init.headers || {}) } }) }
export function parseBody<T extends Record<string, unknown> = { username?: string; password?: string }>(request: Request) { return request.json() as Promise<T> }
