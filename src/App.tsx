import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Float, Html, Sparkles } from '@react-three/drei'
import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import * as THREE from 'three'

type Curiosity = { id: string; content: string; inspiration: string; kind: '恒星' | '小行星'; createdAt: string; trails: Trail[] }
type Trail = { id: string; content: string; createdAt: string }
type ConnectionStatus = 'pending' | 'confirmed' | 'independent' | 'later'
type User = { id: string; username: string }

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('3D scene failed to initialize', error, info) }
  render() { return this.state.error ? <div className="canvas-fallback"><strong>3D 星图暂时无法加载</strong><span>你的好奇内容仍然可以继续使用。</span></div> : this.props.children }
}

const storage = {
  get(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } },
  set(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* Persistence is optional in restricted browsers. */ } },
}
function createId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` }

const DEMO_CURIOSITIES = [
  { id: 'demo-1', content: '为什么夜晚的城市让人更有灵感？', inspiration: '示例宇宙 · 林', kind: '恒星' as const },
  { id: 'demo-2', content: '植物会记住被触碰的感觉吗？', inspiration: '示例宇宙 · 林', kind: '小行星' as const },
]

function loadCuriosities(): Curiosity[] {
  try { return JSON.parse(storage.get('secret-universe-curiosities', '[]')) } catch { return [] }
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后再试。')
  return data as T
}
function formatDate(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

function Nebula() {
  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (group.current) { group.current.rotation.y += delta * 0.025; group.current.rotation.x = Math.sin(Date.now() * 0.00015) * 0.04 } })
  const compact = typeof window !== 'undefined' && window.innerWidth < 700
  return <group ref={group}>
    <Stars radius={80} depth={45} count={compact ? 900 : 1800} factor={2.1} saturation={0.35} fade speed={0.35} />
    <Sparkles count={compact ? 45 : 90} scale={[18, 8, 18]} size={2.5} speed={0.18} opacity={0.42} color="#aab7ff" />
    <Sparkles count={compact ? 18 : 36} scale={[12, 5, 12]} size={5} speed={0.1} opacity={0.18} color="#d59cff" />
    <mesh position={[-4, 0.5, -3]} scale={[5.5, 1.4, 2.2]}><sphereGeometry args={[1, 32, 32]} /><meshBasicMaterial color="#392a75" transparent opacity={0.18} depthWrite={false} /></mesh>
    <mesh position={[4, -0.6, -5]} scale={[4.5, 1.1, 2]}><sphereGeometry args={[1, 32, 32]} /><meshBasicMaterial color="#203b7d" transparent opacity={0.16} depthWrite={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[12, 64]} /><meshBasicMaterial color="#111936" transparent opacity={0.23} /></mesh>
  </group>
}

function OrbitPath({ radius }: { radius: number }) {
  const points = useMemo(() => Array.from({ length: 96 }, (_, index) => { const angle = (index / 95) * Math.PI * 2; return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius) }), [radius])
  return <lineLoop rotation={[0.04, 0, 0]}><bufferGeometry><bufferAttribute attach="attributes-position" count={points.length} array={new Float32Array(points.flatMap(point => point.toArray()))} itemSize={3} /></bufferGeometry><lineBasicMaterial color="#6473bd" transparent opacity={0.16} /></lineLoop>
}

function CelestialBackdrop() {
  const group = useRef<THREE.Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const move = (event: PointerEvent) => { pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2; pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2 }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useFrame((_, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.008
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.current.x * 0.18, 0.025)
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, pointer.current.y * -0.12, 0.025)
  })
  return <group ref={group}>
    <Float speed={0.35} rotationIntensity={0.08} floatIntensity={0.15}>
      <group position={[5.2, 1.3, -6.5]}>
        <mesh><sphereGeometry args={[1.05, 32, 32]} /><meshStandardMaterial color="#b66b4b" emissive="#4b1c2c" emissiveIntensity={0.22} roughness={0.72} metalness={0.08} /></mesh>
        <mesh rotation={[Math.PI / 2.7, 0.18, 0]}><torusGeometry args={[1.35, 0.055, 10, 64]} /><meshStandardMaterial color="#d19f75" emissive="#3a2637" emissiveIntensity={0.3} transparent opacity={0.72} /></mesh>
        <pointLight color="#e29a6d" intensity={1.3} distance={4} />
      </group>
    </Float>
    <Float speed={0.25} rotationIntensity={0.05} floatIntensity={0.12}>
      <group position={[-5.4, -1.2, -7.5]}>
        <mesh><sphereGeometry args={[0.82, 32, 32]} /><meshStandardMaterial color="#386eaa" emissive="#122f6c" emissiveIntensity={0.45} roughness={0.48} metalness={0.14} /></mesh>
        <mesh scale={1.18}><sphereGeometry args={[0.82, 24, 24]} /><meshBasicMaterial color="#4ea4ff" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        <mesh position={[1.15, 0.16, 0.1]}><sphereGeometry args={[0.19, 20, 20]} /><meshStandardMaterial color="#aaa2cc" roughness={0.9} /></mesh>
      </group>
    </Float>
    <Float speed={0.18} rotationIntensity={0.04} floatIntensity={0.09}><mesh position={[7, -2.4, -10]}><sphereGeometry args={[0.48, 24, 24]} /><meshStandardMaterial color="#8c73bb" emissive="#3d2863" emissiveIntensity={0.4} roughness={0.8} /></mesh></Float>
  </group>
}

function Planet({ item, index, selected, onSelect }: { item: Curiosity; index: number; selected: boolean; onSelect: () => void }) {
  const position: [number, number, number] = item.kind === '恒星' ? [0, 0, 0] : [Math.cos(index * 2.1) * (3 + index * 0.45), Math.sin(index * 1.7) * 0.42, Math.sin(index * 2.1) * (3 + index * 0.45)]
  const color = item.kind === '恒星' ? '#f6c66f' : '#8ba7ef'
  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * (item.kind === '恒星' ? 0.08 : 0.2) })
  const radius = 3 + index * 0.45
  return <Float speed={1.1 + index * 0.1} rotationIntensity={0.12} floatIntensity={0.18}>
    <group position={position} ref={group} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      {item.kind === '小行星' && <group position={[-position[0], -position[1], -position[2]]}><OrbitPath radius={radius} /></group>}
      {item.kind === '恒星' && <pointLight color="#ffd78c" intensity={selected ? 18 : 10} distance={7} decay={2} />}
      <mesh><sphereGeometry args={[item.kind === '恒星' ? 0.58 : 0.34, 32, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.4 : 0.55} roughness={item.kind === '恒星' ? 0.25 : 0.82} metalness={item.kind === '恒星' ? 0.05 : 0.18} /></mesh>
      <mesh scale={selected ? 1.55 : 1.25}><sphereGeometry args={[item.kind === '恒星' ? 0.7 : 0.43, 24, 24]} /><meshBasicMaterial color={color} transparent opacity={selected ? 0.2 : 0.08} depthWrite={false} /></mesh>
      {item.kind === '恒星' && <mesh scale={1.9}><sphereGeometry args={[0.7, 24, 24]} /><meshBasicMaterial color="#f6c66f" transparent opacity={0.045} depthWrite={false} /></mesh>}
      <Html position={[0, -0.78, 0]} center distanceFactor={8}><span className={`planet-label ${selected ? 'active' : ''}`}>{item.kind}</span></Html>
    </group>
  </Float>
}

function ConnectionLine({ active }: { active: boolean }) {
  const points = useMemo(() => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.7, 0.1, 1.8)], [])
  return <line><bufferGeometry><bufferAttribute attach="attributes-position" count={2} array={new Float32Array(points.flatMap(p => p.toArray()))} itemSize={3} /></bufferGeometry><lineBasicMaterial color={active ? '#dcae69' : '#64709b'} transparent opacity={active ? 0.9 : 0.35} /></line>
}

function App() {
  const [curiosities, setCuriosities] = useState<Curiosity[]>(loadCuriosities)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirm, setAuthConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showExplore, setShowExplore] = useState(false)
  const [content, setContent] = useState('')
  const [inspiration, setInspiration] = useState('')
  const [trailText, setTrailText] = useState('')
  const [connection, setConnection] = useState<ConnectionStatus>(() => storage.get('secret-universe-connection', 'pending') as ConnectionStatus)
  const [notice, setNotice] = useState('')
  const selected = curiosities.find(item => item.id === selectedId) || null
  useEffect(() => {
    api<{ user: User | null }>('/api/auth/me').then(async ({ user: current }) => {
      setUser(current)
      if (current) {
        const data = await api<{ curiosities: Curiosity[] }>('/api/data/curiosities')
        const link = await api<{ status: ConnectionStatus }>('/api/data/connection')
        setCuriosities(data.curiosities); setConnection(link.status)
      }
    }).catch(() => undefined).finally(() => setAuthReady(true))
  }, [])
  useEffect(() => { if (authReady && !user) storage.set('secret-universe-curiosities', JSON.stringify(curiosities)) }, [curiosities, authReady, user])
  useEffect(() => { if (authReady && !user) storage.set('secret-universe-connection', connection) }, [connection, authReady, user])
  const submitAuth = async () => {
    setAuthError(''); setAuthBusy(true)
    try {
      if (authMode === 'register' && authPassword !== authConfirm) throw new Error('两次输入的密码不一致。')
      const data = await api<{ user: User }>(`/api/auth/${authMode}`, { method: 'POST', body: JSON.stringify({ username: authUsername.trim(), password: authPassword }) })
      setUser(data.user)
      const saved = await api<{ curiosities: Curiosity[] }>('/api/data/curiosities')
      setCuriosities(saved.curiosities)
      const link = await api<{ status: ConnectionStatus }>('/api/data/connection')
      setConnection(link.status)
      setShowAuth(false); setAuthPassword(''); setAuthConfirm(''); setNotice(authMode === 'register' ? '账户已创建，你的宇宙已准备好。' : `欢迎回来，${data.user.username}。`)
    } catch (error) { setAuthError(error instanceof Error ? error.message : '操作失败，请稍后再试。') } finally { setAuthBusy(false) }
  }
  const logout = async () => { try { await api('/api/auth/logout', { method: 'POST' }) } finally { setUser(null); setCuriosities([]); setConnection('pending'); setNotice('已退出登录。') } }
  const create = () => {
    if (!content.trim()) return
    const item: Curiosity = { id: createId(), content: content.trim(), inspiration: inspiration.trim(), kind: curiosities.length ? '小行星' : '恒星', createdAt: new Date().toISOString(), trails: [] }
    const save = user ? api<{ curiosity: Curiosity }>('/api/data/curiosities', { method: 'POST', body: JSON.stringify({ content: item.content, inspiration: item.inspiration }) }).then(result => result.curiosity) : Promise.resolve(item)
    save.then(saved => { setCuriosities(items => [...items, saved]); setContent(''); setInspiration(''); setShowCreate(false); setSelectedId(saved.id); setNotice(saved.kind === '恒星' ? '第一颗恒星已经点亮。' : '新的小行星已进入你的宇宙。') }).catch(error => setNotice(error instanceof Error ? error.message : '保存失败。'))
  }
  const addTrail = () => { if (!selected || !trailText.trim()) return; const trail = { id: createId(), content: trailText.trim(), createdAt: new Date().toISOString() }; const save = user ? api<{ trail: typeof trail }>('/api/data/trails', { method: 'POST', body: JSON.stringify({ curiosityId: selected.id, content: trail.content }) }).then(result => result.trail) : Promise.resolve(trail); save.then(saved => { setCuriosities(items => items.map(item => item.id === selected.id ? { ...item, trails: [...item.trails, saved] } : item)); setTrailText(''); setNotice('好奇轨迹已记录。') }).catch(error => setNotice(error instanceof Error ? error.message : '保存失败。')) }
  const setConnectionStatus = (status: ConnectionStatus) => { setConnection(status); if (user) api('/api/data/connection', { method: 'POST', body: JSON.stringify({ status }) }).catch(() => undefined); setNotice(status === 'confirmed' ? '连接已由你确认。' : status === 'independent' ? '这两个好奇点将保持独立。' : '先把这个连接放在一旁。') }
  return <main className="app-shell">
    <div className="cosmos"><CanvasErrorBoundary><Canvas camera={{ position: [0, 4.8, 8.8], fov: 52 }}><color attach="background" args={['#080b1c']} /><ambientLight intensity={0.25} /><pointLight position={[0, 0, 0]} intensity={12} color="#ffd990" distance={8} /><Nebula /><CelestialBackdrop />{curiosities.length > 0 && <ConnectionLine active={connection === 'confirmed'} />}{curiosities.map((item, index) => <Planet key={item.id} item={item} index={index} selected={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />)}<OrbitControls enablePan={false} minDistance={4} maxDistance={14} /></Canvas></CanvasErrorBoundary><div className="cosmos-vignette" /></div>
    <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><div><strong>我的秘密宇宙</strong><small>把好奇，放进星图里</small></div></div><div className="topbar-actions"><button className="ghost-button" onClick={() => setShowExplore(true)}>漫游示例宇宙 <span>↗</span></button>{user ? <div className="account-menu"><span className="account-name">@{user.username}</span><button className="ghost-button compact" onClick={logout}>退出登录</button></div> : <button className="ghost-button" onClick={() => { setAuthMode('login'); setAuthError(''); setShowAuth(true) }}>登录 / 注册</button>}</div></header>
    <section className="hero-copy"><p className="eyebrow">YOUR CURIOUS UNIVERSE</p><h1>{curiosities.length ? '你的宇宙，正在生长' : '此刻，你在好奇什么？'}</h1><p>{curiosities.length ? '每一个问题都在等待一次新的靠近。拖动视野，看看你的星图。' : '从一个微小的问题开始，创造属于你的第一颗恒星。'}</p>{!curiosities.length && <button className="primary-button" onClick={() => setShowCreate(true)}>创造第一颗恒星 <span>＋</span></button>}</section>
    <aside className="stats-panel"><span><b>{curiosities.length}</b> 个好奇点</span><i /> <span><b>{curiosities.reduce((n, x) => n + x.trails.length, 0)}</b> 条轨迹</span></aside>
    {curiosities.length > 0 && <button className="create-fab" onClick={() => setShowCreate(true)}>＋ <span>记录新的好奇</span></button>}
    {notice && <div className="notice" onAnimationEnd={() => setNotice('')}>{notice}</div>}
    {selected && <section className="detail-card"><button className="close-button" onClick={() => setSelectedId(null)}>×</button><span className="tag">{selected.kind} · {formatDate(selected.createdAt)}</span><h2>{selected.content}</h2>{selected.inspiration && <p className="muted">灵感来源：{selected.inspiration}</p>}<div className="trail-section"><div className="section-title"><span>好奇轨迹</span><em>{selected.trails.length} 条记录</em></div>{selected.trails.length ? <div className="timeline">{selected.trails.map(trail => <div className="timeline-item" key={trail.id}><span className="timeline-dot" /><div><p>{trail.content}</p><small>{formatDate(trail.createdAt)}</small></div></div>)}</div> : <p className="empty-trail">还没有轨迹，记录一次探索吧。</p>}<div className="trail-input"><input value={trailText} onChange={e => setTrailText(e.target.value)} placeholder="记录这次探索发现了什么…" onKeyDown={e => e.key === 'Enter' && addTrail()} /><button onClick={addTrail}>记录</button></div></div><div className="recommendations"><span>继续探索</span><button onClick={() => setShowExplore(true)}>看看类似的好奇有谁在好奇 <b>→</b></button><button onClick={() => setShowExplore(true)}>看看别人在好奇什么 <b>→</b></button></div></section>}
    {curiosities.length > 0 && !selected && <section className="connection-card"><div className="connection-heading"><span className="ai-orb">✧</span><div><span className="tag">系统提出的潜在连接</span><h3>夜晚的光，是否也在唤醒植物？</h3></div></div><p>这两个好奇点都在探索「环境如何影响生命的感受」，也许它们之间存在一条还未命名的轨迹。</p>{connection === 'pending' ? <div className="connection-actions"><button className="primary-small" onClick={() => setConnectionStatus('confirmed')}>确认连接</button><button onClick={() => setConnectionStatus('independent')}>保持独立</button><button onClick={() => setConnectionStatus('later')}>暂不判断</button></div> : <div className="connection-state">{connection === 'confirmed' ? '✦ 这是你确认的连接' : connection === 'independent' ? '○ 你选择让它们保持独立' : '… 暂时搁置这条潜在连接'}</div>}</section>}
    {showCreate && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowCreate(false)}><section className="modal"><button className="close-button" onClick={() => setShowCreate(false)}>×</button><span className="eyebrow">A NEW CURIOSITY</span><h2>此刻，你在好奇什么？</h2><p className="modal-intro">不必完整，不必正确。先把它放进宇宙里。</p><textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder="写下一个让你停顿的问题…" rows={4} /><label>这个好奇从哪儿冒出来的？ <span>选填</span><input value={inspiration} onChange={e => setInspiration(e.target.value)} placeholder="一段对话、一本书，或一个瞬间" /></label><button className="primary-button full" disabled={!content.trim()} onClick={create}>放入我的宇宙 <span>✦</span></button></section></div>}
    {showExplore && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowExplore(false)}><section className="modal explore-modal"><button className="close-button" onClick={() => setShowExplore(false)}>×</button><span className="eyebrow">EXAMPLE EXPLORATION</span><h2>漫游一座示例宇宙</h2><p className="modal-intro">这里是示例数据，用来感受不同好奇之间的距离。</p><div className="demo-list">{DEMO_CURIOSITIES.map((demo, index) => <article key={demo.id}><span className={`demo-planet planet-${index}`}>✦</span><div><strong>{demo.content}</strong><small>{demo.kind} · {demo.inspiration}</small></div></article>)}</div><button className="secondary-button" onClick={() => setShowExplore(false)}>回到我的宇宙</button></section></div>}
    {showAuth && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowAuth(false)}><section className="modal auth-modal"><button className="close-button" onClick={() => setShowAuth(false)}>×</button><span className="eyebrow">YOUR PRIVATE UNIVERSE</span><h2>{authMode === 'login' ? '进入你的宇宙' : '创造你的账户'}</h2><p className="modal-intro">只需要用户名和密码。密码不会保存在浏览器中；忘记密码后目前无法自助找回。</p><label>用户名<input autoFocus value={authUsername} onChange={e => setAuthUsername(e.target.value)} placeholder="3-32 位字母、数字或下划线" autoComplete="username" /></label><label>密码<input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="至少 12 位" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>{authMode === 'register' && <label>确认密码<input type="password" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} placeholder="再次输入密码" autoComplete="new-password" /></label>}{authMode === 'register' && <p className="password-hint">密码长度为 12-128 位。请使用你能记住的密码，当前版本不提供邮件或手机号找回。</p>}{authError && <p className="form-error" role="alert">{authError}</p>}<button className="primary-button full" disabled={authBusy || !authUsername || !authPassword || (authMode === 'register' && !authConfirm)} onClick={submitAuth}>{authBusy ? '处理中…' : authMode === 'login' ? '登录' : '注册并进入'} <span>✦</span></button><button className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? '还没有账户？现在注册' : '已有账户？返回登录'}</button></section></div>}
  </main>
}

export default App
