import { ASSET_PATHS } from '../game/assets.js'
import { useCountUp } from '../hooks/useCountUp.js'
import GuideMascot from './GuideMascot.jsx'

export default function ResultScreen({ resultInfo, onBackToTitle }) {
  const isClear = resultInfo.outcome === 'cleared'
  const startTotal = resultInfo.totalCurrency - resultInfo.currencyEarned
  const displayedEarned = useCountUp(resultInfo.currencyEarned, 700, 0)
  const displayedTotal = useCountUp(resultInfo.totalCurrency, 700, startTotal)

  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      {/* 判子(はんこ)がドンと押されるような演出。素材は1枚(赤い印影の枠)を使い回し、
          クリア/失敗は色フィルターと文字色だけで出し分ける(文字自体はAI生成が苦手なため画像に含めない)。
          画像とテキストを1つのコンテナにまとめて一緒にアニメーションさせ、1つの判子として見せる。 */}
      <div
        className="result-stamp"
        style={{ position: 'relative', width: 220, height: 220, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* 失敗時は「合格印」感のある丸い判子だと違和感があるため、専用の却下スタンプ画像を使う。
            専用画像が無い間だけ、暫定で従来の丸印(判定用フィルター無し)にフォールバックする。 */}
        <img
          src={isClear ? ASSET_PATHS.effectHankoStamp : ASSET_PATHS.effectHankoStampFail}
          alt=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 220,
            height: 220,
            transform: 'translate(-50%, -50%)',
            filter: isClear ? 'hue-rotate(100deg) saturate(1.3)' : 'none',
            opacity: 0.9,
            pointerEvents: 'none',
          }}
          onError={(e) => {
            if (!isClear && e.target.src.includes('effect_hanko_stamp_fail')) {
              e.target.src = ASSET_PATHS.effectHankoStamp
            } else {
              e.target.style.display = 'none'
            }
          }}
        />
        <h2 style={{ position: 'relative', fontSize: 26, margin: 0, color: isClear ? '#f2c14e' : '#c94c4c', padding: '0 30px' }}>
          {isClear ? '完全踏破!' : resultInfo.retired ? '撤退' : '防衛失敗…'}
        </h2>
      </div>
      <div style={{ margin: '20px 0', fontSize: 15 }}>
        <div>到達: 第{resultInfo.chapter ?? 1}章 ターン{resultInfo.turn}</div>
        {resultInfo.relics?.length > 0 && <div>持ち帰った宝珠: {resultInfo.relics.map((r) => r.name.replace('の宝珠', '')).join('・')}</div>}
        <div>撃破数: {resultInfo.kills}</div>
        {resultInfo.spiritEarned > 0 && <div style={{ color: '#c9a8ee' }}>獲得した御霊: +{resultInfo.spiritEarned}(応用編の解放に使えるよ)</div>}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          獲得通貨: +{displayedEarned} (所持合計: {displayedTotal})
          <img src={ASSET_PATHS.iconCoin} alt="" width={16} height={16} />
        </div>
      </div>

      {/* チュートリアル文の代わりに案内キャラに喋らせる流れをここでも踏襲する */}
      <GuideMascot
        message={resultInfo.retired ? 'ここまでの通貨と御霊は持ち帰れたよ。強化してまた挑もう。' : isClear ? '三つの章を踏破して、大禍津日を鎮めたよ!神社は守られたね。' : '妖怪の本殿到達を許しちゃった…。次はスキルツリーで強化してから挑もう。'}
        isError={!isClear}
      />

      <button onClick={onBackToTitle} className="ofuda-button ofuda-button--ema" style={{ marginTop: 12 }}>
        スキルツリーへ戻る
      </button>
    </div>
  )
}
