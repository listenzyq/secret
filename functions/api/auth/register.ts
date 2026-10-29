import { createSession, hashPassword, json, parseBody, randomBytes, sessionCookie, validatePassword, validateUsername, type Env } from '../../lib/auth'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const { username = '', password = '' } = await parseBody(request)
  if (!validateUsername(username)) return json({ error: '用户名需要是 3-32 位字母、数字或下划线。' }, { status: 400 })
  if (!validatePassword(password)) return json({ error: '密码需要 12-128 位。' }, { status: 400 })
  const exists = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').bind(username).first()
  if (exists) return json({ error: '用户名已存在。' }, { status: 409 })
  const id = crypto.randomUUID()
  const salt = randomBytes(16)
  const passwordHash = await hashPassword(password, salt)
  await env.DB.prepare('INSERT INTO users (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, username, passwordHash, salt, Date.now()).run()
  const token = await createSession(env, id)
  return json({ user: { id, username } }, { status: 201, headers: { 'Set-Cookie': sessionCookie(token) } })
}
