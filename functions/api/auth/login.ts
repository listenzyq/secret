import { clearLoginFailures, createSession, hashPassword, json, loginRateLimited, recordLoginFailure, parseBody, sessionCookie, type Env } from '../../lib/auth'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const { username = '', password = '' } = await parseBody(request)
  const attempt = await loginRateLimited(request, env, username)
  if (attempt.limited) return json({ error: '登录尝试过多，请 15 分钟后再试。' }, { status: 429 })
  const row = await env.DB.prepare('SELECT id, username, password_hash, password_salt FROM users WHERE username = ? COLLATE NOCASE').bind(username).first<{ id: string; username: string; password_hash: string; password_salt: Uint8Array }>()
  if (!row) { await recordLoginFailure(env, attempt.key); return json({ error: '用户名或密码错误。' }, { status: 401 }) }
  const passwordHash = await hashPassword(password, new Uint8Array(row.password_salt))
  if (passwordHash !== row.password_hash) { await recordLoginFailure(env, attempt.key); return json({ error: '用户名或密码错误。' }, { status: 401 }) }
  await clearLoginFailures(env, attempt.key)
  const token = await createSession(env, row.id)
  return json({ user: { id: row.id, username: row.username } }, { headers: { 'Set-Cookie': sessionCookie(token) } })
}
