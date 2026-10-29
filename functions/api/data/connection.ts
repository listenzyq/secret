import { getSession, json, parseBody, type Env } from '../../lib/auth'

const allowed = new Set(['pending', 'confirmed', 'independent', 'later'])
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  if (!session) return json({ error: '请先登录。' }, { status: 401 })
  const row = await env.DB.prepare('SELECT status FROM user_connections WHERE user_id = ?').bind(session.user_id).first<{ status: string }>()
  return json({ status: row?.status || 'pending' })
}
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  if (!session) return json({ error: '请先登录。' }, { status: 401 })
  const { status = '' } = await parseBody<{ status?: string }>(request)
  if (!allowed.has(status)) return json({ error: '无效的连接状态。' }, { status: 400 })
  await env.DB.prepare('INSERT INTO user_connections (user_id, status, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at').bind(session.user_id, status, Date.now()).run()
  return json({ status })
}
