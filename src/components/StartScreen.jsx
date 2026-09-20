import { ASSET_PATHS } from '../game/assets.js'

// ゲームを開いて最初に出る画面。ロゴと「はじめる/つづきから」だけの静かな画面にして、
// いきなりスキルツリーが出て戸惑わないようにする。最初のクリックで音も使えるようになる。
export default function StartScreen({ hasSave, onStart, banner }) {
  const petals = Array.from({ length: 12 }, (_, i) => ({
    left: (i * 8.7 + 4) % 100,
    dur: 9 + ((i * 1.9) % 7),
    delay: -((i * 2.7) % 12),
    size: 14 + ((i * 5) % 14),
  }))
  return (
    <div className="start-screen">
      {petals.map((p, i) => (
        <img
          key={i}
          className="start-petal"
          src={ASSET_PATHS.decorPetal}
          alt=""
          style={{ left: `${p.left}%`, width: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
          onError={(e) => (e.target.style.display = 'none')}
        />
      ))}
      <div className="start-inner">
        {banner}
        <p className="start-tagline">札を置き、社を守れ。</p>
        <button onClick={onStart} className="ofuda-button ofuda-button--ema start-button">
          {hasSave ? 'つづきから' : 'はじめる'}
        </button>
        <p className="start-note">セーブはこのブラウザに保存されます</p>
      </div>
      <p className="start-credit">
        イラストの一部は生成AIを用いて作成しています。
        <br />© 紙守り
      </p>
    </div>
  )
}
