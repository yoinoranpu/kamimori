import { useState } from 'react'
import { ASSET_PATHS } from '../game/assets.js'
import { playRelicGet } from '../game/sound.js'

const CATEGORY = {
  stat: { text: '強化', color: '#f2c14e', hint: '数値がそのまま強くなる' },
  rule: { text: 'ルール変化', color: '#7fc28a', hint: '札の働き方そのものが変わる' },
  special: { text: '特化', color: '#e0645a', hint: '得意な札・相手を伸ばす' },
}

const CHAPTER_BOSS = { 1: '荒魂', 2: '凍姫' }

// 章ボス(・節目のボス)を倒した時に出る、宝珠を1つ選ぶ画面。
// 一枚ずつ順番に浮かび上がり、選ぶと選んだ宝珠だけが光って残り、他は静かに消えてから次へ進む。
export default function RelicChoiceScreen({ bossName, choices, chapter = 1, owned = [], rerollsLeft = 0, onReroll, onChoose }) {
  const [chosenId, setChosenId] = useState(null)

  const choose = (relic) => {
    if (chosenId) return
    setChosenId(relic.id)
    playRelicGet() // 選んだ瞬間に鳴らす(次の画面へ進む前の余韻の間に聞こえるように)
    setTimeout(() => onChoose(relic.id), 900)
  }

  return (
    <div className="relic-stage">
      <div className="relic-rays" aria-hidden="true" />
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="relic-mote" style={{ left: `${(i * 6.4 + 3) % 100}%`, animationDelay: `${-((i * 1.3) % 9)}s`, animationDuration: `${7 + ((i * 1.7) % 6)}s` }} aria-hidden="true" />
      ))}

      <div className="relic-head">
        <span className="relic-chip">宝珠を授かる</span>
        <h2 className="relic-title">{bossName ?? CHAPTER_BOSS[chapter] ?? 'ボス'}を撃退した!</h2>
        <p className="relic-sub">宝珠を1つ選ぼう。この周回のあいだ、力を貸してくれる。</p>
      </div>

      <div className="relic-cards">
        {choices.map((relic, i) => {
          const cat = CATEGORY[relic.category] ?? CATEGORY.stat
          const state = chosenId ? (chosenId === relic.id ? 'chosen' : 'faded') : ''
          return (
            <button
              key={relic.id}
              className={`relic-card ${state}`}
              style={{ '--c': cat.color, '--i': i }}
              onClick={() => choose(relic)}
              disabled={!!chosenId}
            >
              <span className="relic-orb">
                <img src={ASSET_PATHS.relicIcon[relic.category]} alt="" onError={(e) => (e.target.style.display = 'none')} />
              </span>
              <span className="relic-cat">{cat.text}</span>
              <span className="relic-name">{relic.name}</span>
              <span className="relic-desc">{relic.description}</span>
              <span className="relic-pick">{state === 'chosen' ? '授かった!' : 'この宝珠を選ぶ'}</span>
            </button>
          )
        })}
      </div>

      {rerollsLeft > 0 && !chosenId && (
        <button onClick={onReroll} className="ofuda-button" style={{ marginTop: 22, padding: '6px 20px', fontSize: 13 }}>
          引き直す(残り{rerollsLeft}回)
        </button>
      )}

      {owned.length > 0 && (
        <div className="relic-owned">
          <span style={{ opacity: 0.7 }}>これまでの宝珠:</span>
          {owned.map((r) => (
            <span key={r.id} style={{ borderColor: (CATEGORY[r.category] ?? CATEGORY.stat).color }}>
              {r.name.replace('の宝珠', '')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
