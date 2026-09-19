import { ASSET_PATHS } from '../game/assets.js'

// ターン開始時に一瞬だけ出る、筆文字の「第Nターン」演出。
// 数字はAI画像に焼き込まず(文字生成が苦手なため)、達筆な和風Webフォントで描画する。
// 背景の墨の飛沫はただの装飾画像なので、AI生成でも安全。
export default function TurnAnnouncement({ turn, chapterTitle }) {
  return (
    <div className="turn-announce-overlay">
      <div className="turn-announce-swoosh">
        <img
          src={ASSET_PATHS.effectBrushSwoosh}
          alt=""
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        <div className="turn-announce-text">{chapterTitle ?? `第${turn}ターン`}</div>
      </div>
    </div>
  )
}
