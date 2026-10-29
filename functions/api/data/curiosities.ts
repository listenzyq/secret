import { getSession, json, parseBody, type Env } from '../../lib/auth'

type CuriosityRow = { id: string; content: string; inspiration: string; kind: '恒星' | '小行星'; created_at: number }

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  if (!session) return json({ error: '请先登录。' }, { status: 401 })
  const rows = await env.DB.prepare('SELECT id, content, inspiration, kind, created_at FROM curiosities WHERE user_id = ? ORDER BY created_at ASC').bind(session.user_id).all<CuriosityRow>()
  const trails = await env.DB.prepare('SELECT id, curiosity_id, content, created_at FROM curiosity_trails WHERE user_id = ? ORDER BY created_at ASC').bind(session.user_id).all<{ id: string; curiosity_id: string; content: string; created_at: number }>()
  const trailMap = new Map<string, { id: string; content: string; createdAt: string }[]>()
  for (const trail of trails.results) {
    const list = trailMap.get(trail.curiosity_id) || []
    list.push({ id: trail.id, content: trail.content, createdAt: new Date(trail.created_at).toISOString() })
    trailMap.set(trail.curiosity_id, list)
  }
  return json({ curiosities: rows.results.map(row => ({ id: row.id, content: row.content, inspiration: row.inspiration, kind: row.kind, createdAt: new Date(row.created_at).toISOString(), trails: trailMap.get(row.id) || [] })) })
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  if (!session) return json({ error: '请先登录。' }, { status: 401 })
  const { content = '', inspiration = '' } = await parseBody<{ content?: string; inspiration?: string }>(request)
  if (!content.trim() || content.trim().length > 1000 || inspiration.length > 1000) return json({ error: '好奇内容不能为空且不能超过 1000 字。' }, { status: 400 })
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM curiosities WHERE user_id = ?').bind(session.user_id).first<{ count: number }>()
  const curiosity = { id: crypto.randomUUID(), content: content.trim(), inspiration: inspiration.trim(), kind: Number(count?.count || 0) === 0 ? '恒星' as const : '小行星' as const, createdAt: new Date().toISOString(), trails: [] }
  await env.DB.prepare('INSERT INTO curiosities (id, user_id, content, inspiration, kind, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(curiosity.id, session.user_id, curiosity.content, curiosity.inspiration, curiosity.kind, Date.parse(curiosity.createdAt)).run()
  return json({ curiosity }, { status: 201 })
}
