import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

type Props = { children: ReactNode }
type State = { error: Error | null }

class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Secret Universe failed to render', error, info) }

  render() {
    if (this.state.error) {
      return <div className="fatal-error" role="alert"><strong>宇宙暂时无法加载</strong><p>页面初始化时遇到问题，请刷新后重试。</p><code>{this.state.error.message}</code></div>
    }
    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')
const bootFallback = document.getElementById('boot-fallback')
bootFallback?.remove()
createRoot(rootElement).render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>)
