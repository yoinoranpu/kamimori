import { ASSET_PATHS } from '../game/assets.js'

// チュートリアルを作り込む代わりに、この案内キャラに喋らせて説明を肩代わりさせる。
// 札→ボタン→吹き出し→キャラ、の順に縦につながる構図の一部として、通常のフローの中に
// 配置する(独立した隅置きオーバーレイだと繋がりが無く見えるため、あえて浮かせていない)。
// 画像がまだ無い間はキャラ抜きで吹き出しだけ表示する(getImage方式と同じ、非表示にするだけの
// グレースフルフォールバック)。
export default function GuideMascot({ message, isError, size = 92, bubbleMax = 200, fontSize }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginTop: 4 }}>
      <div
        className={`guide-bubble guide-bubble--right${isError ? ' guide-bubble--error' : ''}`}
        style={{ maxWidth: bubbleMax, marginBottom: 14, ...(fontSize ? { fontSize } : {}) }}
      >
        {message}
      </div>
      <img
        src={ASSET_PATHS.characterGuide}
        alt=""
        width={size}
        height={size}
        className="mascot-idle"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))', flexShrink: 0 }}
        onError={(e) => {
          e.target.style.display = 'none'
        }}
      />
    </div>
  )
}
