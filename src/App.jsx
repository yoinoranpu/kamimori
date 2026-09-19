import { useEffect, useMemo, useRef, useState } from 'react'
import GameCanvas from './components/GameCanvas.jsx'
import CandidatePicker from './components/CandidatePicker.jsx'
import SkillTreeScreen from './components/SkillTreeScreen.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import TurnAnnouncement from './components/TurnAnnouncement.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import { describeWave, armedHint, waveHasWard } from './game/briefing.js'
import { isTutorialDone, markTutorialDone, resetTutorial, tutorialSelectMessage, TREE_FIRST_MESSAGE } from './game/tutorial.js'
import SaveManager from './components/SaveManager.jsx'
import { createRunState, placeTower, startWave, startChapter } from './game/engine.js'
import { drawCandidates } from './game/candidates.js'
import { loadSkillState, saveSkillState, getEffects, unlockNode } from './game/skillTree.js'
import { applyRelicEffects, pickRelicChoices, getFavoredOfuda, getRelic } from './game/relics.js'
import { getChapter } from './game/chapters.js'
import RelicChoiceScreen from './components/RelicChoiceScreen.jsx'
import { MAX_TURN, FIELD, ENEMY_TYPES, OFUDA_TYPES, CANDIDATE_PICK_MAX, chapterStartBonus } from './game/constants.js'
import { ASSET_PATHS, preloadAllAssets } from './game/assets.js'
import { playWaveClear, playDefeat, playTurnClear, playTaiko, playRelicGet, isMuted, setMuted } from './game/sound.js'
import { CANDIDATE_COUNT } from './game/constants.js'
import { useCountUp } from './hooks/useCountUp.js'

// タイトルロゴの帯(雲・波・花の装飾込み)。タイトル画面では大きく、ゲーム中は縦スペースを
// 圧迫しない小さめサイズで、彩りを添えるために上部にも出す。
function TitleBanner({ compact }) {
  // 筆文字の「紙守り」は専用画像(title_calligraphy.png)を使う。万一読み込めない場合だけ
  // Webフォントの文字にフォールバックする。
  const [calligraphyFailed, setCalligraphyFailed] = useState(false)
  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: compact ? 'min(360px, 92%)' : 'min(640px, 100%)',
          aspectRatio: '2013 / 365',
          margin: '0 auto',
          backgroundColor: '#e9dfc7',
          backgroundImage: `url(${ASSET_PATHS.uiTitleLogo})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          borderRadius: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* ui_title_logo.png内の白い帯を実測(横17.1%〜86.6%、縦34.0%〜77.5%、中心55.75%)し、
            その高さぴったりに収まるサイズで題字を重ねる(はみ出すと「大きすぎる」ズレに見えるため、
            幅ではなく高さ基準でフィットさせる)。 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '55.75%',
            transform: 'translate(-50%, -50%)',
            height: '40%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {calligraphyFailed ? (
            <h1
              style={{
                margin: 0,
                fontSize: compact ? 14 : 22,
                fontFamily: "'Shippori Mincho', serif",
                fontWeight: 800,
                color: '#3a2f22',
              }}
            >
              紙守り
            </h1>
          ) : (
            <img
              src={ASSET_PATHS.titleCalligraphy}
              alt="紙守り"
              style={{ height: '100%', width: 'auto', display: 'block' }}
              onError={() => setCalligraphyFailed(true)}
            />
          )}
        </div>
      </div>
      {!compact && <p style={{ textAlign: 'center', margin: '2px 0 8px', opacity: 0.75, fontSize: 12, color: '#f0e6d2' }}>お札タワーディフェンス</p>}
    </div>
  )
}

export default function App() {
  const [skillState, setSkillState] = useState(() => loadSkillState())
  // 宝珠はその周回(3章分)限り。周回が終わる/新しく始めるたびに空に戻る
  const [runRelics, setRunRelics] = useState([])
  const effects = useMemo(() => applyRelicEffects(getEffects(skillState), runRelics), [skillState, runRelics])
  const [relicChoices, setRelicChoices] = useState([])
  const [rerollsLeft, setRerollsLeft] = useState(0)
  const [chapter, setChapter] = useState(1)
  const handledChapterRef = useRef(false)
  const handledMilestoneRef = useRef(false)
  // 宝珠選択画面がどこから来たか: 'chapter'=章ボス(次章へ) / 'milestone'=章の途中の節目ボス(同じ章を続行)
  const relicFromRef = useRef('chapter')
  // その周回で章ボスを倒して得た御霊(周回の終わりにまとめて所持へ加算する)
  const runSpiritRef = useRef(0)
  const [muted, setMutedState] = useState(() => isMuted())
  const [tutorialDone, setTutorialDone] = useState(() => isTutorialDone())
  const finishTutorial = () => {
    markTutorialDone()
    setTutorialDone(true)
  }

  // 最初の画像読み込みが終わるまでローディング画面を出し、図形フォールバックが
  // 一瞬見えてしまう雑な瞬間を隠す
  const [loadProgress, setLoadProgress] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  useEffect(() => {
    preloadAllAssets(setLoadProgress).then(() => setAssetsReady(true))
  }, [])

  // index.cssのbackground-image/border-imageは、ビルド後は物理的にassets/配下に置かれた
  // CSSファイル自身からの相対パスとして解決されてしまい、開発時(ページルート基準で解決される)
  // と挙動がずれて本番ビルド/Artifact公開時にだけ画像が見つからなくなる。
  // そのためCSS側には直接url()を書かず、BASE_URLを正しく踏まえたASSET_PATHS由来のURLを
  // カスタムプロパティとして注入し、CSS側はvar()経由で参照する。
  // 注意: CSSカスタムプロパティにurl()を入れても、それが参照(var())される側のスタイル
  // シート基準で相対解決されてしまう(定義した場所基準にはならない)ため、ここで
  // 「相対パスのまま」渡すと同じ問題が再発する。new URL()でdocument基準の絶対URLに
  // 変換してから渡すことで、どこから参照されても一意に解決できるようにする。
  useEffect(() => {
    const abs = (path) => new URL(path, document.baseURI).href
    const root = document.documentElement.style
    root.setProperty('--url-page-bg', `url("${abs(ASSET_PATHS.uiPageBackground)}")`)
    root.setProperty('--url-button-frame', `url("${abs(ASSET_PATHS.uiButtonFrame)}")`)
    root.setProperty('--url-panel-texture', `url("${abs(ASSET_PATHS.uiPanelTexture)}")`)
    root.setProperty('--url-hud-panel', `url("${abs(ASSET_PATHS.uiHudPanel)}")`)
    root.setProperty('--url-field-frame', `url("${abs(ASSET_PATHS.uiFieldFrame)}")`)
  }, [])

  const [screen, setScreen] = useState('title')
  const runStateRef = useRef(null)
  const handledOutcomeRef = useRef(false)
  const handledWaveClearRef = useRef(false)
  const hudFrameRef = useRef(0)

  const [turn, setTurn] = useState(1)
  // スキル「二刀流」「目利き」の反映
  const pickMax = CANDIDATE_PICK_MAX + (effects.extraPick ?? 0) + chapterStartBonus(chapter, turn)
  // 配る先のターンにシールド持ちの敵が出るなら、解放済みの祓の札を必ず候補に入れる(引けずに詰むのを防ぐ)
  const dealCandidates = (favored = null, forChapter = chapter, forTurn = turn) => {
    const picks = CANDIDATE_PICK_MAX + (effects.extraPick ?? 0) + chapterStartBonus(forChapter, forTurn)
    const count = Math.max(CANDIDATE_COUNT + (effects.extraCandidates ?? 0), picks + 1)
    return drawCandidates(effects.unlockedOfuda, favored, count, waveHasWard(forChapter, forTurn, effects.enemyCountMult ?? 1) ? ['harai'] : [])
  }
  const [candidates, setCandidates] = useState([])
  const [armedIndex, setArmedIndex] = useState(null)
  const [placedIndices, setPlacedIndices] = useState(new Set())
  const [waveHud, setWaveHud] = useState({ kills: 0, currency: 0, enemiesLeft: 0, waveCleared: false, outcome: null, currentBatch: -1, totalBatches: 0 })
  const [resultInfo, setResultInfo] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [placementError, setPlacementError] = useState(false)
  const placementErrorTimerRef = useRef(null)
  const [dragGhost, setDragGhost] = useState(null)
  const seenSpecialTypesRef = useRef(new Set())
  const [turnAnnounce, setTurnAnnounce] = useState(null)
  const turnAnnounceSeqRef = useRef(0)

  // 毎ターン開始時に一瞬「第Nターン」を筆文字で表示する(太鼓の音も添える)
  const announceTurn = (n, chapterTitle) => {
    turnAnnounceSeqRef.current += 1
    setTurnAnnounce({ turn: n, chapterTitle, seq: turnAnnounceSeqRef.current })
    playTaiko()
  }

  useEffect(() => {
    if (!turnAnnounce) return undefined
    const timer = setTimeout(() => setTurnAnnounce(null), 1700)
    return () => clearTimeout(timer)
  }, [turnAnnounce])

  const updateSkillState = (next) => {
    setSkillState(next)
    saveSkillState(next)
  }

  const startRun = () => {
    runStateRef.current = createRunState()
    handledOutcomeRef.current = false
    handledChapterRef.current = false
    handledMilestoneRef.current = false
    runSpiritRef.current = 0
    setRunRelics([])
    setChapter(1)
    seenSpecialTypesRef.current = new Set()
    setTurn(1)
    setCandidates(dealCandidates(null, 1, 1))
    setArmedIndex(null)
    setPlacedIndices(new Set())
    setWaveHud({ kills: 0, currency: 0, enemiesLeft: 0, waveCleared: false, outcome: null, currentBatch: -1, totalBatches: 0, chapterCleared: false })
    setSpeed(1)
    setScreen('select')
    announceTurn(1)
  }

  const handleArm = (i) => {
    if (placedIndices.has(i)) return
    setArmedIndex(i)
  }

  const attemptPlace = (i, x, y) => {
    const typeId = candidates[i]
    const ok = placeTower(runStateRef.current, x, y, typeId, effects)
    if (ok) {
      setPlacedIndices((prev) => new Set(prev).add(i))
      setArmedIndex(null)
    } else {
      // 近すぎて置けない、など。無反応だと分かりにくいので一瞬メッセージを出す
      setPlacementError(true)
      clearTimeout(placementErrorTimerRef.current)
      placementErrorTimerRef.current = setTimeout(() => setPlacementError(false), 1200)
    }
  }

  const handleCanvasClickDuringSelect = (x, y) => {
    if (armedIndex == null) return
    attemptPlace(armedIndex, x, y)
  }

  // スマホ(タッチ)向けのドラッグ配置。HTML5のdraggable/dragstartはタッチでは発火しないため、
  // Pointer Eventsで自前にドラッグ→指を離した位置がcanvas上かどうかを判定して配置する。
  // マウスでのネイティブHTML5ドラッグ(CandidatePicker側)はそのまま残し、タッチの時だけこちらを使う。
  const handleCardPointerDown = (i, e) => {
    if (e.pointerType !== 'touch' || placedIndices.has(i)) return
    e.preventDefault()
    handleArm(i)
    setDragGhost({ typeId: candidates[i], x: e.clientX, y: e.clientY })

    const handleMove = (moveEv) => {
      setDragGhost((g) => (g ? { ...g, x: moveEv.clientX, y: moveEv.clientY } : g))
    }
    const handleUp = (upEv) => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      setDragGhost(null)
      const el = document.elementFromPoint(upEv.clientX, upEv.clientY)
      const canvas = el && el.tagName === 'CANVAS' ? el : null
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const x = (upEv.clientX - rect.left) * (FIELD.width / rect.width)
        const y = (upEv.clientY - rect.top) * (FIELD.height / rect.height)
        attemptPlace(i, x, y)
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  const proceedToWave = () => {
    handledWaveClearRef.current = false
    startWave(runStateRef.current, turn, effects)
    setScreen('wave')
  }

  const goToNextTurn = () => {
    handledMilestoneRef.current = false
    const nextTurn = turn + 1
    if (nextTurn >= 3 && !tutorialDone) finishTutorial() // 初回の案内は最初の2ターンだけ
    setTurn(nextTurn)
    setCandidates(dealCandidates(getFavoredOfuda(runRelics), chapter, nextTurn))
    setArmedIndex(null)
    setPlacedIndices(new Set())
    setScreen('select')
    announceTurn(nextTurn)
  }

  const handleFrame = (state) => {
    hudFrameRef.current += 1

    // 中ボス・ボスの初登場だけは倍速のまま流されないよう、1倍速に戻す
    for (const e of state.enemies) {
      const def = ENEMY_TYPES[e.type]
      if (!(def.isBoss || def.isMidBoss)) continue
      if (seenSpecialTypesRef.current.has(e.type)) continue
      seenSpecialTypesRef.current.add(e.type)
      setSpeed((s) => (s > 1 ? 1 : s))
    }

    // ウェーブクリア/勝敗確定は間引かずに即座に反映する(数値表示だけ間引く)
    if (hudFrameRef.current % 6 === 0 || state.waveCleared || state.outcome || state.chapterCleared || state.milestoneCleared) {
      setWaveHud({
        kills: state.kills,
        currency: state.currencyThisRun,
        enemiesLeft: state.enemies.length + state.spawnQueue.length,
        waveCleared: state.waveCleared,
        outcome: state.outcome,
        currentBatch: state.currentBatch,
        totalBatches: state.totalBatches,
        chapterCleared: state.chapterCleared,
        milestoneCleared: state.milestoneCleared,
      })
    }

    // 章の途中の節目ボスを倒したら、宝珠(と御霊1)をもらって同じ章を続ける
    if (state.milestoneCleared && !handledMilestoneRef.current) {
      handledMilestoneRef.current = true
      runSpiritRef.current += 1 + (effects.spiritBonus ?? 0)
      playWaveClear()
      setTimeout(() => {
        const choices = pickRelicChoices(runRelics, effects.relicChoiceCount ?? 3, effects.unlockedOfuda)
        if (choices.length > 0) {
          relicFromRef.current = 'milestone'
          setRelicChoices(choices)
          setRerollsLeft(effects.relicRerolls ?? 0)
          setScreen('relic')
        } else {
          goToNextTurn()
        }
      }, 1600)
    }

    // 第1・2章のボスを倒したら、少し余韻を置いてから宝珠を選ぶ画面へ
    if (state.chapterCleared && !handledChapterRef.current) {
      handledChapterRef.current = true
      runSpiritRef.current += state.chapter + (effects.spiritBonus ?? 0) // 章が深いほど多くもらえる(1・2・3)
      playWaveClear()
      setTimeout(() => {
        const choices = pickRelicChoices(runRelics, effects.relicChoiceCount ?? 3, effects.unlockedOfuda)
        if (choices.length > 0) {
          relicFromRef.current = 'chapter'
          setRelicChoices(choices)
          setRerollsLeft(effects.relicRerolls ?? 0)
          setScreen('relic')
        } else {
          enterNextChapter(runRelics)
        }
      }, 1600)
    }
    // ターンのウェーブをクリアした瞬間に短いチャイムを鳴らす(周回自体の決着音は下のoutcome側で別に鳴らす)
    if (state.waveCleared && !state.outcome && !handledWaveClearRef.current) {
      handledWaveClearRef.current = true
      playTurnClear()
    }

    if (state.outcome && !handledOutcomeRef.current) {
      finishRun(state, false)
    }
  }

  // 周回の締め: 通貨・御霊を持ち帰ってリザルトへ。retired=trueは自分から撤退した場合(音は鳴らさない)
  function finishRun(state, retired) {
    {
      handledOutcomeRef.current = true
      if (!tutorialDone) finishTutorial()
      if (!retired) {
        if (state.outcome === 'cleared') playWaveClear()
        else playDefeat()
      }
      const currencyEarned = state.currencyThisRun
      if (state.outcome === 'cleared') runSpiritRef.current += state.chapter + (effects.spiritBonus ?? 0)
      const spiritEarned = runSpiritRef.current
      const nextSkillState = { ...skillState, currency: skillState.currency + currencyEarned, spirit: (skillState.spirit ?? 0) + spiritEarned }
      updateSkillState(nextSkillState)
      setResultInfo({
        outcome: state.outcome,
        currencyEarned,
        turn: state.turn,
        kills: state.kills,
        totalCurrency: nextSkillState.currency,
        chapter: state.chapter,
        spiritEarned,
        retired,
        relics: runRelics.map(getRelic),
      })
      setScreen('result')
    }
  }

  // 撤退: それまでの通貨と、倒した章ボスの御霊はそのまま持ち帰れる。誤タップ防止に2回押しで確定。
  const [retireArmed, setRetireArmed] = useState(false)
  useEffect(() => {
    if (!retireArmed) return undefined
    const timer = setTimeout(() => setRetireArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [retireArmed])
  const handleRetire = () => {
    if (!retireArmed) {
      setRetireArmed(true)
      return
    }
    setRetireArmed(false)
    const state = runStateRef.current
    if (!state || handledOutcomeRef.current) return
    state.outcome = 'defeated' // 進行中のウェーブをその場で止める
    finishRun(state, true)
  }

  // 宝珠を選んだ後(または選べる宝珠が無い場合)に、次の章のターン1へ進む
  function enterNextChapter(relicsNow) {
    const state = runStateRef.current
    const next = state.chapter + 1
    startChapter(state, next)
    handledChapterRef.current = false
    setChapter(next)
    setTurn(1)
    setCandidates(dealCandidates(getFavoredOfuda(relicsNow), next, 1))
    setArmedIndex(null)
    setPlacedIndices(new Set())
    setWaveHud({ kills: state.kills, currency: state.currencyThisRun, enemiesLeft: 0, waveCleared: false, outcome: null, currentBatch: -1, totalBatches: 0, chapterCleared: false, milestoneCleared: false })
    setSpeed(1)
    setScreen('select')
    const ch = getChapter(next)
    announceTurn(1, `${ch.name} ${ch.subtitle}`)
  }

  const handleRelicChosen = (relicId) => {
    const nextRelics = [...runRelics, relicId]
    setRunRelics(nextRelics)
    playRelicGet()
    // 開幕の宝珠は選んだ瞬間に通貨ボーナスを受け取る
    if (relicId === 'head_start') runStateRef.current.currencyThisRun += 100
    if (relicFromRef.current === 'milestone') {
      // 節目ボスの報酬: 同じ章の次のターンへ(お札は持ち越し)
      handledMilestoneRef.current = false
      const nextTurn = turn + 1
      setTurn(nextTurn)
      setCandidates(dealCandidates(getFavoredOfuda(nextRelics), chapter, nextTurn))
      setArmedIndex(null)
      setPlacedIndices(new Set())
      setScreen('select')
      announceTurn(nextTurn)
      return
    }
    enterNextChapter(nextRelics)
  }

  const handleRelicReroll = () => {
    if (rerollsLeft <= 0) return
    setRerollsLeft((n) => n - 1)
    setRelicChoices(pickRelicChoices(runRelics, effects.relicChoiceCount ?? 3, effects.unlockedOfuda))
  }

  const handleUnlockNode = (node) => {
    updateSkillState(unlockNode(skillState, node))
  }

  // 通貨表示は瞬間切り替えでなく、じわっとカウントアップさせて豪華に見せる
  const displayedCurrency = useCountUp(waveHud.currency)

  if (!assetsReady) {
    return (
      <div style={{ width: '100%', maxWidth: 960 }}>
        <LoadingScreen progress={loadProgress} />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 960 }}>
      {/* ゲーム中(select/wave/result)は縦スペースを圧迫しないよう、タイトル画面だけ大きく出す */}
      {screen === 'title' && <TitleBanner />}

      {screen === 'title' && (
        <div key="title" className="screen-transition">
          <SkillTreeScreen
            skillState={skillState}
            onUnlock={handleUnlockNode}
            onStartRun={startRun}
            defaultMessage={!tutorialDone && skillState.currency === 0 && Object.keys(skillState.nodeTiers).length <= 1 ? TREE_FIRST_MESSAGE : undefined}
          />
          <SaveManager
            skillState={skillState}
            onReplace={(next) => updateSkillState(next)}
            onReset={() => {
              updateSkillState({ currency: 0, spirit: 0, nodeTiers: { root: 1 } })
              resetTutorial()
              setTutorialDone(false)
            }}
          />
        </div>
      )}

      {(screen === 'select' || screen === 'wave') && (
        <div key="run" className="screen-transition" style={{ position: 'relative' }}>
          <TitleBanner compact />
          <div
            className="ofuda-hud-panel"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
              fontSize: 13,
              padding: '8px 24px',
              flexWrap: 'wrap', // 狭い画面では折り返す(はみ出して数字が切れるのを防ぐ)
              gap: '4px 6px',
              color: '#3a2f22',
            }}
          >
            <img
              src={ASSET_PATHS.decorShide}
              alt=""
              className="hud-shide hud-shide--left"
              onError={(e) => (e.target.style.display = 'none')}
            />
            <img
              src={ASSET_PATHS.decorShide}
              alt=""
              className="hud-shide hud-shide--right"
              onError={(e) => (e.target.style.display = 'none')}
            />
            <span className="hud-stat hud-stat--turn">
              第{chapter}章 ターン {turn} / {MAX_TURN}
              {/* icon_turn.pngは細長い蝋燭の全身画像(74×550px)なので、そのまま正方形に収めると
                  潰れて壊れて見える。炎の先端だけを正方形風に切り出して使う。 */}
              <img
                src={ASSET_PATHS.iconTurn}
                alt=""
                width={16}
                height={20}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                onError={(e) => (e.target.style.display = 'none')}
              />
            </span>
            {screen === 'wave' && waveHud.totalBatches > 0 && (
              <span className="hud-stat hud-stat--turn">ウェーブ {Math.min(waveHud.currentBatch + 1, waveHud.totalBatches)} / {waveHud.totalBatches}</span>
            )}
            <span className="hud-stat hud-stat--kills">
              撃破: {waveHud.kills}
              <img src={ASSET_PATHS.iconKillCount} alt="" width={18} height={18} onError={(e) => (e.target.style.display = 'none')} />
            </span>
            <span className="hud-stat hud-stat--currency">
              獲得通貨: {displayedCurrency}
              <img src={ASSET_PATHS.iconCoin} alt="" width={18} height={18} className="hud-coin-shine" />
            </span>
            <span className="hud-stat hud-stat--enemies">残敵: {waveHud.enemiesLeft}</span>
          </div>

          {/* 再生速度・宝珠の一覧・撤退を1行にまとめる(行を増やすと画面が縦に伸びてスクロールが出るため)。
              速度ボタンはselect中も場所を確保したまま隠し、ウェーブ開始でキャンバスの位置がズレないようにする */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', minHeight: 28, marginBottom: 4, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', visibility: screen === 'wave' ? 'visible' : 'hidden' }}>
              <span style={{ fontSize: 13, opacity: 0.8 }}>再生速度:</span>
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`ofuda-button${speed === s ? ' ofuda-button--primary' : ''}`}
                style={{ padding: '4px 14px', fontSize: 13 }}
              >
                {s}x
              </button>
            ))}
            </span>
            <span style={{ opacity: 0.8, marginLeft: 6 }}>宝珠:</span>
            {runRelics.length === 0 ? (
              <span style={{ opacity: 0.55 }}>なし</span>
            ) : (
              runRelics.map((id) => {
                const r = getRelic(id)
                const color = { stat: '#f2c14e', rule: '#7a915a', special: '#c94c4c' }[r.category]
                return (
                  <span
                    key={id}
                    title={r.description}
                    style={{ border: `1px solid ${color}`, color: '#f0e6d2', background: 'rgba(0,0,0,0.35)', borderRadius: 999, padding: '2px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help' }}
                  >
                    <img src={ASSET_PATHS.relicIcon[r.category]} alt="" width={16} height={16} onError={(e) => (e.target.style.display = 'none')} />
                    {r.name.replace('の宝珠', '')}
                  </span>
                )
              })
            )}
            <button
              onClick={handleRetire}
              className="ofuda-button"
              style={{ marginLeft: 'auto', padding: '2px 12px', fontSize: 12, opacity: retireArmed ? 1 : 0.7 }}
            >
              {retireArmed ? '本当に撤退する?' : '撤退'}
            </button>
          </div>

          <GameCanvas
            runStateRef={runStateRef}
            active={screen === 'wave'}
            onCanvasClick={screen === 'select' ? handleCanvasClickDuringSelect : null}
            skillEffects={effects}
            onFrame={screen === 'wave' ? handleFrame : undefined}
            previewTypeId={screen === 'select' && armedIndex != null ? candidates[armedIndex] : null}
            speed={speed}
          />

          {/* フィールドを先に見せてから、その下でカードを選んで配置する導線にする
              (スマホでの親指の届きやすさ、視線の流れの両方を意識) */}
          {screen === 'select' && (
            <div style={{ marginTop: 4 }}>
              <CandidatePicker
                pickMax={pickMax}
                candidates={candidates}
                armedIndex={armedIndex}
                placedIndices={placedIndices}
                onArm={handleArm}
                onProceed={proceedToWave}
                onCardPointerDown={handleCardPointerDown}
                placementError={placementError}
                guideMessage={
                  placementError
                    ? '近すぎて置けないよ。もう少し離してみて。'
                    : !tutorialDone && chapter === 1 && turn <= 2
                      ? tutorialSelectMessage({ turn, armed: armedIndex != null, allPlaced: placedIndices.size >= pickMax })
                    : armedIndex != null
                      ? [OFUDA_TYPES[candidates[armedIndex]].flavor, armedHint(candidates[armedIndex], chapter, turn, effects.enemyCountMult ?? 1)].filter(Boolean).join(' ')
                      : `${describeWave(chapter, turn, effects.enemyCountMult ?? 1) ?? ''}あと${pickMax - placedIndices.size}枚置けるよ。札を選んでフィールドに置いてね。`
                }
              />
            </div>
          )}

          {screen === 'wave' && waveHud.waveCleared && !waveHud.outcome && !waveHud.chapterCleared && !waveHud.milestoneCleared && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button onClick={goToNextTurn} className="ofuda-button ofuda-button--ema">
                次のターンへ ▶
              </button>
            </div>
          )}
        </div>
      )}

      {screen === 'relic' && (
        <div key="relic" className="screen-transition">
          <RelicChoiceScreen
            choices={relicChoices}
            chapter={chapter}
            bossName={relicFromRef.current === 'milestone' ? getChapter(chapter).milestone?.name : undefined}
            owned={runRelics.map(getRelic)}
            rerollsLeft={rerollsLeft}
            onReroll={handleRelicReroll}
            onChoose={handleRelicChosen}
          />
        </div>
      )}

      {screen === 'result' && resultInfo && (
        <div key="result" className="screen-transition">
          <ResultScreen resultInfo={resultInfo} onBackToTitle={() => setScreen('title')} />
        </div>
      )}

      <button
        onClick={() => {
          setMuted(!muted)
          setMutedState(!muted)
        }}
        className="ofuda-button"
        style={{ position: 'fixed', top: 8, right: 8, zIndex: 900, padding: '3px 10px', fontSize: 11, opacity: 0.85 }}
        aria-label="効果音のオン/オフ"
      >
        音: {muted ? 'OFF' : 'ON'}
      </button>

      {turnAnnounce && <TurnAnnouncement key={turnAnnounce.seq} turn={turnAnnounce.turn} chapterTitle={turnAnnounce.chapterTitle} />}

      {dragGhost && (
        <img
          src={ASSET_PATHS.ofudaCard[dragGhost.typeId]}
          alt=""
          style={{
            position: 'fixed',
            left: dragGhost.x,
            top: dragGhost.y,
            width: 40,
            height: 60,
            transform: 'translate(-50%, -50%) rotate(-6deg)',
            pointerEvents: 'none',
            opacity: 0.85,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            zIndex: 1000,
          }}
        />
      )}
    </div>
  )
}
