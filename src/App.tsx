import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Float, Html } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type Curiosity = { id: string; content: string; inspiration: string; kind: '恒星' | '小行星'; createdAt: string; trails: Trail[] }
type Trail = { id: string; content: string; createdAt: string }
type ConnectionStatus = 'pending' | 'confirmed' | 'independent' | 'later'

const DEMO_CURIOSITIES = [
  { id: 'demo-1', content: '为什么夜晚的城市让人更有灵感？', inspiration: '示例宇宙 · 林', kind: '恒星' as const },
  { id: 'demo-2', content: '植物会记住被触碰的感觉吗？', inspiration: '示例宇宙 · 林', kind: '小行星' as const },
]

function loadCuriosities(): Curiosity[] {
  try { return JSON.parse(localStorage.getItem('secret-universe-curiosities') || '[]') } catch { return [] }
}
function formatDate(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

function Nebula() {
  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (group.current) { group.current.rotation.y += delta * 0.025; group.current.rotation.x = Math.sin(Date.now() * 0.00015) * 0.04 } })
  return <group ref={group}><Stars radius={80} depth={45} count={1800} factor={2.1} saturation={0.2} fade speed={0.35} /><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[12, 64]} /><meshBasicMaterial color="#111936" transparent opacity={0.23} /></mesh></group>
}

function Planet({ item, index, selected, onSelect }: { item: Curiosity; index: number; selected: boolean; onSelect: () => void }) {
  const position: [number, number, number] = item.kind === '恒星' ? [0, 0, 0] : [Math.cos(index * 2.1) * (3 + index * 0.45), Math.sin(index * 1.7) * 0.42, Math.sin(index * 2.1) * (3 + index * 0.45)]
  const color = item.kind === '恒星' ? '#f6c66f' : '#8ba7ef'
  return <Float speed={1.1 + index * 0.1} rotationIntensity={0.12} floatIntensity={0.18}>
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <mesh><sphereGeometry args={[item.kind === '恒星' ? 0.58 : 0.34, 32, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.4 : 0.55} roughness={0.4} /></mesh>
      <mesh scale={selected ? 1.45 : 1.2}><sphereGeometry args={[item.kind === '恒星' ? 0.7 : 0.43, 24, 24]} /><meshBasicMaterial color={color} transparent opacity={selected ? 0.16 : 0.08} /></mesh>
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showExplore, setShowExplore] = useState(false)
  const [content, setContent] = useState('')
  const [inspiration, setInspiration] = useState('')
  const [trailText, setTrailText] = useState('')
  const [connection, setConnection] = useState<ConnectionStatus>(() => (localStorage.getItem('secret-universe-connection') as ConnectionStatus | null) || 'pending')
  const [notice, setNotice] = useState('')
  const selected = curiosities.find(item => item.id === selectedId) || null
  useEffect(() => localStorage.setItem('secret-universe-curiosities', JSON.stringify(curiosities)), [curiosities])
  useEffect(() => localStorage.setItem('secret-universe-connection', connection), [connection])
  const create = () => {
    if (!content.trim()) return
    const item: Curiosity = { id: crypto.randomUUID(), content: content.trim(), inspiration: inspiration.trim(), kind: curiosities.length ? '小行星' : '恒星', createdAt: new Date().toISOString(), trails: [] }
    setCuriosities(items => [...items, item]); setContent(''); setInspiration(''); setShowCreate(false); setSelectedId(item.id); setNotice(item.kind === '恒星' ? '第一颗恒星已经点亮。' : '新的小行星已进入你的宇宙。')
  }
  const addTrail = () => { if (!selected || !trailText.trim()) return; const trail = { id: crypto.randomUUID(), content: trailText.trim(), createdAt: new Date().toISOString() }; setCuriosities(items => items.map(item => item.id === selected.id ? { ...item, trails: [...item.trails, trail] } : item)); setTrailText(''); setNotice('好奇轨迹已记录。') }
  const setConnectionStatus = (status: ConnectionStatus) => { setConnection(status); setNotice(status === 'confirmed' ? '连接已由你确认。' : status === 'independent' ? '这两个好奇点将保持独立。' : '先把这个连接放在一旁。') }
  return <main className="app-shell">
    <div className="cosmos"><Canvas camera={{ position: [0, 4.8, 8.8], fov: 52 }}><color attach="background" args={['#080b1c']} /><ambientLight intensity={0.25} /><pointLight position={[0, 0, 0]} intensity={12} color="#ffd990" distance={8} /><Nebula />{curiosities.length > 0 && <ConnectionLine active={connection === 'confirmed'} />}{curiosities.map((item, index) => <Planet key={item.id} item={item} index={index} selected={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />)}<OrbitControls enablePan={false} minDistance={4} maxDistance={14} /></Canvas><div className="cosmos-vignette" /></div>
    <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><div><strong>我的秘密宇宙</strong><small>把好奇，放进星图里</small></div></div><button className="ghost-button" onClick={() => setShowExplore(true)}>漫游示例宇宙 <span>↗</span></button></header>
    <section className="hero-copy"><p className="eyebrow">YOUR CURIOUS UNIVERSE</p><h1>{curiosities.length ? '你的宇宙，正在生长' : '此刻，你在好奇什么？'}</h1><p>{curiosities.length ? '每一个问题都在等待一次新的靠近。拖动视野，看看你的星图。' : '从一个微小的问题开始，创造属于你的第一颗恒星。'}</p>{!curiosities.length && <button className="primary-button" onClick={() => setShowCreate(true)}>创造第一颗恒星 <span>＋</span></button>}</section>
    <aside className="stats-panel"><span><b>{curiosities.length}</b> 个好奇点</span><i /> <span><b>{curiosities.reduce((n, x) => n + x.trails.length, 0)}</b> 条轨迹</span></aside>
    {curiosities.length > 0 && <button className="create-fab" onClick={() => setShowCreate(true)}>＋ <span>记录新的好奇</span></button>}
    {notice && <div className="notice" onAnimationEnd={() => setNotice('')}>{notice}</div>}
    {selected && <section className="detail-card"><button className="close-button" onClick={() => setSelectedId(null)}>×</button><span className="tag">{selected.kind} · {formatDate(selected.createdAt)}</span><h2>{selected.content}</h2>{selected.inspiration && <p className="muted">灵感来源：{selected.inspiration}</p>}<div className="trail-section"><div className="section-title"><span>好奇轨迹</span><em>{selected.trails.length} 条记录</em></div>{selected.trails.length ? <div className="timeline">{selected.trails.map(trail => <div className="timeline-item" key={trail.id}><span className="timeline-dot" /><div><p>{trail.content}</p><small>{formatDate(trail.createdAt)}</small></div></div>)}</div> : <p className="empty-trail">还没有轨迹，记录一次探索吧。</p>}<div className="trail-input"><input value={trailText} onChange={e => setTrailText(e.target.value)} placeholder="记录这次探索发现了什么…" onKeyDown={e => e.key === 'Enter' && addTrail()} /><button onClick={addTrail}>记录</button></div></div><div className="recommendations"><span>继续探索</span><button onClick={() => setShowExplore(true)}>看看类似的好奇有谁在好奇 <b>→</b></button><button onClick={() => setShowExplore(true)}>看看别人在好奇什么 <b>→</b></button></div></section>}
    {curiosities.length > 0 && !selected && <section className="connection-card"><div className="connection-heading"><span className="ai-orb">✧</span><div><span className="tag">系统提出的潜在连接</span><h3>夜晚的光，是否也在唤醒植物？</h3></div></div><p>这两个好奇点都在探索「环境如何影响生命的感受」，也许它们之间存在一条还未命名的轨迹。</p>{connection === 'pending' ? <div className="connection-actions"><button className="primary-small" onClick={() => setConnectionStatus('confirmed')}>确认连接</button><button onClick={() => setConnectionStatus('independent')}>保持独立</button><button onClick={() => setConnectionStatus('later')}>暂不判断</button></div> : <div className="connection-state">{connection === 'confirmed' ? '✦ 这是你确认的连接' : connection === 'independent' ? '○ 你选择让它们保持独立' : '… 暂时搁置这条潜在连接'}</div>}</section>}
    {showCreate && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowCreate(false)}><section className="modal"><button className="close-button" onClick={() => setShowCreate(false)}>×</button><span className="eyebrow">A NEW CURIOSITY</span><h2>此刻，你在好奇什么？</h2><p className="modal-intro">不必完整，不必正确。先把它放进宇宙里。</p><textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder="写下一个让你停顿的问题…" rows={4} /><label>这个好奇从哪儿冒出来的？ <span>选填</span><input value={inspiration} onChange={e => setInspiration(e.target.value)} placeholder="一段对话、一本书，或一个瞬间" /></label><button className="primary-button full" disabled={!content.trim()} onClick={create}>放入我的宇宙 <span>✦</span></button></section></div>}
    {showExplore && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowExplore(false)}><section className="modal explore-modal"><button className="close-button" onClick={() => setShowExplore(false)}>×</button><span className="eyebrow">EXAMPLE EXPLORATION</span><h2>漫游一座示例宇宙</h2><p className="modal-intro">这里是示例数据，用来感受不同好奇之间的距离。</p><div className="demo-list">{DEMO_CURIOSITIES.map((demo, index) => <article key={demo.id}><span className={`demo-planet planet-${index}`}>✦</span><div><strong>{demo.content}</strong><small>{demo.kind} · {demo.inspiration}</small></div></article>)}</div><button className="secondary-button" onClick={() => setShowExplore(false)}>回到我的宇宙</button></section></div>}
  </main>
}

export default App
