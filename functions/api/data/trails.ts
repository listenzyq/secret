import { getSession, json, parseBody, type Env } from '../../lib/auth'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  if (!session) return json({ error: '请先登录。' }, { status: 401 })
  const { curiosityId = '', content = '' } = await parseBody<{ curiosityId?: string; content?: string }>(request)
  if (!curiosityId || !content.trim() || content.trim().length > 1000) return json({ error: '探索记录不能为空且不能超过 1000 字。' }, { status: 400 })
  const owns = await env.DB.prepare('SELECT id FROM curiosities WHERE id = ? AND user_id = ?').bind(curiosityId, session.user_id).first()
  if (!owns) return json({ error: '找不到这个好奇点。' }, { status: 404 })
  const trail = { id: crypto.randomUUID(), content: content.trim(), createdAt: new Date().toISOString() }
  await env.DB.prepare('INSERT INTO curiosity_trails (id, curiosity_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)').bind(trail.id, curiosityId, session.user_id, trail.content, Date.parse(trail.createdAt)).run()
  return json({ trail }, { status: 201 })
}
