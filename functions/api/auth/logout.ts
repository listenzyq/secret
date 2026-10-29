import { destroySession, json, sessionCookie, type Env } from '../../lib/auth'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  await destroySession(request, env)
  return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } })
}
