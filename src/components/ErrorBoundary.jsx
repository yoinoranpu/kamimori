import { Component } from 'react'

// 画面の描画中に想定外のエラーが出ても、真っ白のまま固まらないようにする最後の砦。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: 24, color: '#f0e6d2', textAlign: 'center', border: '2px solid #5b4636', borderRadius: 10, background: 'rgba(0,0,0,0.5)' }}>
        <h2 style={{ marginTop: 0 }}>エラーが起きました</h2>
        <p style={{ opacity: 0.85 }}>ごめんね、ゲームが止まってしまったよ。再読み込みすると戻れます(スキルツリーのセーブは残っています)。</p>
        <pre style={{ textAlign: 'left', fontSize: 11, opacity: 0.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(this.state.error?.message ?? this.state.error)}</pre>
        <button onClick={() => location.reload()} className="ofuda-button" style={{ padding: '6px 24px' }}>
          再読み込み
        </button>
      </div>
    )
  }
}
