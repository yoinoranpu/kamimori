import { ASSET_PATHS } from '../game/assets.js'

const CATEGORY_LABEL = {
  stat: { text: '強化', color: '#f2c14e' },
  rule: { text: 'ルール変化', color: '#7a915a' },
  special: { text: '特化', color: '#c94c4c' },
}

// ボス撃破時だけ出る、宝珠を1つ選ぶ画面。スキルツリーの地道な強化とは別に、
// 「一回の当たりで方向性が変わる」ローグライク的な選択を挟む。
const CHAPTER_BOSS = { 1: '荒魂', 2: '凍姫' }

export default function RelicChoiceScreen({ bossName, choices, chapter = 1, owned = [], rerollsLeft = 0, onReroll, onChoose }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#f2c14e' }}>{bossName ?? CHAPTER_BOSS[chapter] ?? 'ボス'}を撃退した!</h2>
      <p style={{ margin: '0 0 20px', opacity: 0.85, fontSize: 13 }}>宝珠を1つ選ぼう。この周回の間だけ力を貸してくれるよ。これから使う札を決める手がかりにしてね。</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 12px' }}>
        {choices.map((relic) => {
          const cat = CATEGORY_LABEL[relic.category]
          return (
            <button
              key={relic.id}
              onClick={() => onChoose(relic.id)}
              className="ofuda-panel"
              style={{
                width: 180,
                minHeight: 190,
                border: '2px solid #5b4636',
                borderRadius: 10,
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                color: '#f0e6d2',
                textAlign: 'center',
              }}
            >
              {/* 宝珠のイラスト(分類ごとに1枚)。未用意の間は表示しない */}
              <img
                src={ASSET_PATHS.relicIcon[relic.category]}
                alt=""
                width={56}
                height={56}
                style={{ objectFit: 'contain' }}
                onError={(e) => (e.target.style.display = 'none')}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: cat.color,
                  border: `1px solid ${cat.color}`,
                  borderRadius: 999,
                  padding: '2px 10px',
                }}
              >
                {cat.text}
              </span>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>{relic.name}</div>
              <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>{relic.description}</div>
            </button>
          )
        })}
      </div>
      {rerollsLeft > 0 && (
        <button onClick={onReroll} className="ofuda-button" style={{ marginTop: 18, padding: '6px 18px', fontSize: 13 }}>
          引き直す(残り{rerollsLeft}回)
        </button>
      )}
      {owned.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 12, opacity: 0.85 }}>
          所持中の宝珠: {owned.map((r) => r.name).join(' / ')}
        </div>
      )}
    </div>
  )
}
