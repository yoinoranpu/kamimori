import { ASSET_PATHS } from '../game/assets.js'

// 最初の画像読み込みが終わるまでの間、雑に見える瞬間(図形フォールバックが一瞬見える等)を
// 隠すためのローディング画面。お札が一枚、ひらひら舞い降り続けるループ演出。
export default function LoadingScreen({ progress }) {
  const percent = Math.round(progress * 100)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        minHeight: '60vh',
        color: '#f0e6d2',
      }}
    >
      <div style={{ position: 'relative', width: 90, height: 320, overflow: 'hidden' }}>
        <img
          src={ASSET_PATHS.ofudaCard.basic}
          alt=""
          className="loading-card-fall"
          style={{ position: 'absolute', left: '50%', width: 70, marginLeft: -35, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}
        />
      </div>
      <div style={{ fontSize: 14, opacity: 0.85 }}>読み込み中... {percent}%</div>
    </div>
  )
}
