import { OFUDA_TYPES, CANDIDATE_PICK_MAX } from '../game/constants.js'
import { ASSET_PATHS } from '../game/assets.js'
import GuideMascot from './GuideMascot.jsx'
import { useState } from 'react'

// 札のイラストが未用意の間は、色付きの簡易カードで代用する
function CardImage({ typeId, def, style }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        style={{
          ...style,
          width: 88,
          height: 132,
          boxSizing: 'border-box',
          background: def.color,
          border: `3px solid ${def.accent}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 44,
          fontWeight: 'bold',
          color: def.accent,
        }}
      >
        {def.label}
      </div>
    )
  }
  return <img src={ASSET_PATHS.ofudaCard[typeId]} alt={def.name} width={88} height={132} draggable={false} style={{ objectFit: 'contain', ...style }} onError={() => setFailed(true)} />
}

export default function CandidatePicker({ pickMax = CANDIDATE_PICK_MAX, candidates, armedIndex, placedIndices, onArm, onProceed, onCardPointerDown, guideMessage, placementError }) {
  const placedCount = placedIndices.size
  const reachedMax = placedCount >= pickMax

  // トランプの手札のように扇状に並べる: 中央のカードを軸に左右へ少しずつ傾け、
  // 中央ほど高く浮かせる。選択中(armed)はさらに大きく持ち上げて手に取った感じを出す。
  const center = (candidates.length - 1) / 2
  const TILT_STEP = 9
  const ARC_HEIGHT = 14

  // 札→ボタン→吹き出し→キャラ、を縦ではなく横一列につなげる(その方が収まりが良いとの指摘)。
  return (
    <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center' }}>
        {candidates.map((typeId, i) => {
          const def = OFUDA_TYPES[typeId]
          const isPlaced = placedIndices.has(i)
          const isArmed = armedIndex === i
          const disabled = isPlaced || (reachedMax && !isArmed)
          const tilt = (i - center) * TILT_STEP
          const arc = ARC_HEIGHT - Math.abs(i - center) * ARC_HEIGHT
          const rise = arc + (isArmed ? 18 : 0)
          const glow = isArmed
            ? `drop-shadow(0 0 10px ${def.accent}) drop-shadow(0 6px 8px rgba(0,0,0,0.5))`
            : 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))'
          return (
            <button
              key={i}
              className="candidate-card"
              onClick={() => onArm(i)}
              disabled={disabled}
              draggable={false}
              onPointerDown={(e) => {
                if (disabled) return
                onCardPointerDown(i, e)
              }}
              style={{
                '--tilt': `${tilt}deg`,
                '--rise': `${rise}px`,
                transformOrigin: 'bottom center',
                zIndex: isArmed ? 5 : 1,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: disabled ? 'default' : 'grab',
                touchAction: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                // ターンごとにCandidatePicker自体が再マウントされるので、毎回配られ直す演出が自然に再生される
                animation: 'card-deal 0.4s ease-out',
                animationDelay: `${i * 0.08}s`,
                animationFillMode: 'backwards',
              }}
            >
              <CardImage
                typeId={typeId}
                def={def}
                style={{
                  filter: isPlaced ? 'grayscale(1) brightness(0.6)' : glow,
                  opacity: isPlaced ? 0.6 : 1,
                }}
              />
              <div style={{ fontSize: 13, color: isPlaced ? '#8a8171' : '#f0e6d2', fontWeight: 'bold' }}>{def.name}</div>
            </button>
          )
        })}
      </div>
      <button onClick={onProceed} className="ofuda-button ofuda-button--ema">
        ウェーブ開始 ▶
      </button>
      {/* 札→ボタン→吹き出し→キャラ、の順に縦一列につながって見えるよう、案内キャラも
          このすぐ下にまとめて配置する(以前は画面の隅に独立して浮かせていたが、
          全体の構図として繋がりが無く分かりにくいとの指摘を受けて統合した) */}
      <GuideMascot message={guideMessage} isError={!!placementError} />
    </div>
  )
}
