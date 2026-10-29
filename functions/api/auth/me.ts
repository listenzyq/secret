import { getSession, json, type Env } from '../../lib/auth'

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const session = await getSession(request, env)
  return json({ user: session ? { id: session.user_id, username: session.username } : null })
}
