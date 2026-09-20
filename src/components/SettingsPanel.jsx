import { useEffect } from 'react'
import SaveManager from './SaveManager.jsx'

// 設定パネル(音のオン/オフ・周回からの撤退・セーブ管理をまとめる)。
// 画面右上の「設定」ボタンから開く。開いている間、ウェーブの進行は止まる(App側で制御)。
export default function SettingsPanel({ open, onClose, muted, onToggleMute, inRun, retireArmed, onRetire, saveProps }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(240,230,210,0.15)' }
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10, 6, 3, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-label="設定"
        onClick={(e) => e.stopPropagation()}
        className="ofuda-panel"
        style={{ width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto', border: '3px solid #5b4636', borderRadius: 10, padding: '18px 20px', color: '#f0e6d2' }}
      >
        <h2 style={{ margin: '0 0 6px', fontSize: 20, letterSpacing: '0.2em', textAlign: 'center' }}>設定</h2>

        <div style={row}>
          <span>効果音</span>
          <button onClick={onToggleMute} className="ofuda-button" style={{ padding: '4px 18px', fontSize: 13 }}>
            {muted ? 'OFF' : 'ON'}
          </button>
        </div>

        {inRun && (
          <div style={row}>
            <span style={{ fontSize: 13 }}>
              この周回をあきらめる
              <br />
              <span style={{ opacity: 0.7, fontSize: 12 }}>それまでの通貨と御霊は持ち帰れます</span>
            </span>
            <button onClick={onRetire} className="ofuda-button" style={{ padding: '4px 14px', fontSize: 13, color: retireArmed ? '#ff9c8a' : undefined }}>
              {retireArmed ? '本当に撤退する?' : '撤退'}
            </button>
          </div>
        )}

        <div style={{ paddingTop: 10 }}>
          <div style={{ fontSize: 14, marginBottom: 2 }}>セーブ</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>セーブはこのブラウザに保存されます。別の端末へ移すときや、消える前の控えに。</div>
          <SaveManager {...saveProps} embedded />
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={onClose} className="ofuda-button" style={{ padding: '5px 26px', fontSize: 14 }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
