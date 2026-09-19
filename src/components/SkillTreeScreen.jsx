import { useEffect, useRef, useState } from 'react'
import { OFUDA_TYPES } from '../game/constants.js'
import { buildNodeList, canUnlock, computeVisibleNodeIds, getNode, getTier, nodeCurrency, ADVANCED_GATE } from '../game/skillTree.js'

// 入口ノードは解放するまで「？？？」。開けたら応用編として名前が出る。
function displayName(node, skillState) {
  if (node.id === ADVANCED_GATE) return getTier(skillState, node.id) > 0 ? '応用編' : '？？？'
  return node.name
}

const costLabel = (node, tier) => `${node.costs[tier]}${nodeCurrency(node) === 'spirit' ? '御霊' : ''}`
import { SKILL_TREE_LAYOUT } from '../game/skillTreeLayout.js'
import { getImage, ASSET_PATHS } from '../game/assets.js'
import { startCharge, updateCharge, stopCharge } from '../game/sound.js'
import GuideMascot from './GuideMascot.jsx'
import { NODE_DESC } from '../game/nodeDescriptions.js'

const RADIUS = 34
const HOLD_DURATION_MS = 650 // 長押しでノードを解放するのに必要な時間

const OFUDA_ACCENT = Object.fromEntries(Object.values(OFUDA_TYPES).map((d) => [d.id, d.accent]))

// ノードidの先頭部分(fire_, earth_, ...)からどの札のアイコンを使うかを判定する。
// unlock/stat/abilityどのグループでも同じ札のアイコンを共有するので、
// stat/abilityノードにだけ小さいバッジを重ねて見分けられるようにする。
function nodeOfudaId(node) {
  const prefix = node.id.split('_')[0]
  return OFUDA_TYPES[prefix] ? prefix : null
}

function nodeIcon(node) {
  if (ASSET_PATHS.nodeIcon[node.id]) return ASSET_PATHS.nodeIcon[node.id]
  if (node.group === 'root') return ASSET_PATHS.ofudaIcon.basic
  if (node.group === 'damage') return ASSET_PATHS.iconDamageUp
  if (node.group === 'currency') return ASSET_PATHS.iconCoin
  const ofudaId = nodeOfudaId(node)
  return ofudaId ? ASSET_PATHS.ofudaIcon[ofudaId] : null
}

// 木全体が茶色一色でのっぺりして見えるという指摘を受けて、4本の根本の系統ごとに
// ほんのり色付いた光暈を敷き、どの方向がどの属性かも一目でわかるようにする。
// ノードの下に出す名前: 「強化:」などの前置きは省き、7文字ずつ最大2行(超えたら…)にする
function labelLines(name) {
  const short = name.includes(':') ? name.split(':').slice(1).join(':') : name
  const chars = [...short]
  if (chars.length <= 7) return [short]
  if (chars.length <= 14) return [chars.slice(0, 7).join(''), chars.slice(7).join('')]
  return [chars.slice(0, 7).join(''), chars.slice(7, 13).join('') + '…']
}

const THREAD_H = 12
const THREAD_ASPECT = 1118 / 166

const BRANCH_GLOW = [
  { id: 'fire_unlock', color: '#d9612b' },
  { id: 'earth_unlock', color: '#7a915a' },
  { id: 'support_unlock', color: '#c9a23a' },
  { id: 'basic_boost', color: '#c94c4c' },
]

function nodeColor(node) {
  if (node.group === 'root') return '#f0e6d2'
  if (node.group === 'damage') return '#c94c4c'
  if (node.group === 'currency') return '#f2c14e'
  if (node.group === 'special') return '#c9a8ee'
  const ofudaId = nodeOfudaId(node)
  return OFUDA_ACCENT[ofudaId] ?? '#8a8a8a'
}

// 'maxed'=最大段階まで解放済み / 'available'=次の段階を今すぐ解放可能(金縁)
// 'partial'=一部の段階だけ解放済みで次はまだ / 'unaffordable'=前提は満たすが通貨不足
// 'locked'=前提未解放
function nodeState(skillState, node) {
  if (node.group === 'root') return 'maxed'
  const tier = getTier(skillState, node.id)
  if (tier >= node.maxTier) return 'maxed'
  const prereqMet = node.requires.every((r) => getTier(skillState, r.id) >= (r.tier ?? 1))
  if (!prereqMet) return 'locked'
  if (canUnlock(skillState, node)) return 'available'
  return tier > 0 ? 'partial' : 'unaffordable'
}

function missingRequirementNames(skillState, node) {
  return node.requires
    .filter((r) => getTier(skillState, r.id) < (r.tier ?? 1))
    .map((r) => {
      const reqNode = getNode(r.id)
      const label = reqNode ? displayName(reqNode, skillState) : r.id
      return r.tier && r.tier > 1 ? `${label}(${r.tier}/${reqNode?.maxTier})` : label
    })
}

export default function SkillTreeScreen({ skillState, onUnlock, onStartRun, defaultMessage }) {
  const allNodes = buildNodeList()
  const visibleIds = computeVisibleNodeIds(skillState)
  const nodes = allNodes.filter((n) => visibleIds.has(n.id))
  const { positions, viewBox } = SKILL_TREE_LAYOUT
  const [unlockError, setUnlockError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const unlockErrorTimerRef = useRef(null)

  // スクロールバーの代わりに、画面をつかんで動かす(ドラッグパン、上下左右とも)方式で
  // ツリー全体を見られるようにする。ホイールでズームも可能(zoomは中身の表示幅%に反映する
  // ことで、パン量のクランプ計算をピクセル単位のまま単純に保てる)。
  const viewportRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const contentAspect = viewBox.h / viewBox.w

  // svgRef.current.clientWidth/Heightから実測すると、ズーム変更直後(再レンダー前)は
  // まだ古いサイズしか読めず、パン量をその場で正しくクランプできない(ズーム起点がずれる
  // 原因になっていた)。viewport幅×zoomから解析的に計算することで、DOM更新を待たずに
  // 常に「これから反映されるべき」サイズでクランプできるようにする。
  const clampPan = (next, zoomOverride = zoom) => {
    const viewport = viewportRef.current
    if (!viewport) return next
    const contentW = viewport.clientWidth * zoomOverride
    const contentH = contentW * contentAspect
    const minX = Math.min(0, viewport.clientWidth - contentW)
    const minY = Math.min(0, viewport.clientHeight - contentH)
    return {
      x: Math.min(0, Math.max(minX, next.x)),
      y: Math.min(0, Math.max(minY, next.y)),
    }
  }

  // ノードの上から始めても(長押し狙いと紛らわしいので)一旦は両方受け付け、実際にある程度
  // 動いた時点で初めて「これはパン操作だ」と判定する。動く前に指を離せば通常のノード長押し/
  // クリックがそのまま成立する(あらかじめノードかどうかで弾いていたが、ノードが密集していて
  // 掴もうとした場所がノードに当たり、パンが始まらないことが多かったため撤廃した)。
  const DRAG_THRESHOLD_PX = 8

  const handleViewportPointerDown = (e) => {
    // ここではまだpointer captureしない(単なるクリック/ノード長押しの可能性がまだ残っており、
    // 先に奪ってしまうとノード側のonClick/onPointerUpが正しく届かなくなるため)
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y, moved: false, pointerId: e.pointerId }
  }

  const handleViewportPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true
      setIsDragging(true)
      cancelCharge() // ドラッグだと判明した時点で、誤って始まっていたノードの長押しは取り消す
      // 捕捉に失敗しても(例: 既にポインタが離れている等)パン自体は継続させたいので、
      // 失敗してもここで処理を止めない
      try {
        e.currentTarget.setPointerCapture(drag.pointerId)
      } catch {
        /* noop */
      }
    }
    if (drag.moved) {
      setPan(clampPan({ x: drag.originX + dx, y: drag.originY + dy }))
    }
  }

  const endViewportDrag = () => {
    dragRef.current = null
    setIsDragging(false)
  }

  // ReactのonWheelはpassiveリスナーとして登録され、その中ではpreventDefault()が効かず
  // ページ本体までスクロールしてしまう。non-passiveで明示的にDOMへ直接登録する。
  // ズームはマウスカーソルの位置を起点にする(カーソル下の点が画面上で動かないよう、
  // ズーム前後でその点の見かけ位置が一致するようパン量も同時に補正する)。
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      setZoom((z) => {
        // 上限は「ノードが実寸に近い大きさ」になる倍率。狭い画面ほどツリー全体に対して大きな倍率が必要
        const maxZoom = Math.max(2.4, (1.0 * viewBox.w) / viewport.clientWidth)
        const nextZoom = Math.min(maxZoom, Math.max(0.6, z * (1 - e.deltaY * 0.0012)))
        const factor = nextZoom / z
        setPan((p) =>
          clampPan(
            {
              x: cursorX - (cursorX - p.x) * factor,
              y: cursorY - (cursorY - p.y) * factor,
            },
            nextZoom,
          ),
        )
        return nextZoom
      })
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [])

  // 最初は中心(基本の札)を画面の真ん中に据える。応用編が右に長く伸びるので、
  // 何もしないと左上の余白しか見えないため。
  useEffect(() => {
    const center = () => {
      const viewport = viewportRef.current
      if (!viewport || viewport.clientWidth === 0) return false
      // ノードが読める大きさ(ツリー座標の約0.7倍)で始める。画面幅が狭いほど倍率を上げる
      const startZoom = Math.max(1.6, (0.7 * viewBox.w) / viewport.clientWidth)
      const scale = (viewport.clientWidth * startZoom) / viewBox.w
      const root = positions.root
      setZoom(startZoom)
      setPan(clampPan({ x: viewport.clientWidth / 2 - root.x * scale, y: viewport.clientHeight / 2 - root.y * scale }, startZoom))
      return true
    }
    // 画面遷移中やタブが隠れている間は幅が0のことがあるので、測れるようになった最初の1回だけ
    // 中央寄せする(ResizeObserverで待つ。フレーム数で諦めると、後から表示された時に効かない)
    if (center()) return undefined
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      if (center()) ro.disconnect()
    })
    ro.observe(viewport)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 長押しで解放するための状態。クリック一発ではなく「ためて解放する」演出にすることで、
  // 取得した実感を強める(音程も長押し中にどんどん上がっていく)。
  const [chargingId, setChargingId] = useState(null)
  const [chargeProgress, setChargeProgress] = useState(0)
  const chargeAnimRef = useRef(null)
  const chargeStartRef = useRef(0)
  const chargeNodeRef = useRef(null)

  useEffect(() => {
    // アンマウント時に音・アニメーションを確実に止める
    return () => {
      if (chargeAnimRef.current) cancelAnimationFrame(chargeAnimRef.current)
      stopCharge(false)
    }
  }, [])

  const showUnlockError = (message) => {
    setUnlockError(message)
    clearTimeout(unlockErrorTimerRef.current)
    unlockErrorTimerRef.current = setTimeout(() => setUnlockError(null), 1800)
  }

  const cancelCharge = () => {
    if (chargeAnimRef.current) {
      cancelAnimationFrame(chargeAnimRef.current)
      chargeAnimRef.current = null
    }
    if (chargeNodeRef.current) {
      stopCharge(false)
      chargeNodeRef.current = null
    }
    setChargingId(null)
    setChargeProgress(0)
  }

  const beginCharge = (node) => {
    chargeNodeRef.current = node
    chargeStartRef.current = performance.now()
    setChargingId(node.id)
    setChargeProgress(0)
    startCharge()
    const tick = (now) => {
      const progress = Math.min((now - chargeStartRef.current) / HOLD_DURATION_MS, 1)
      setChargeProgress(progress)
      updateCharge(progress)
      if (progress >= 1) {
        stopCharge(true)
        chargeAnimRef.current = null
        chargeNodeRef.current = null
        setChargingId(null)
        setChargeProgress(0)
        onUnlock(node)
        return
      }
      chargeAnimRef.current = requestAnimationFrame(tick)
    }
    chargeAnimRef.current = requestAnimationFrame(tick)
  }

  // クリックしても反応が無いと「バグって開かない」ように見えるため、
  // 解放できない理由(通貨不足/前提未解放)を必ずその場で表示する
  // ノードを選ぶと、案内キャラがそのノードの説明と、解放できるか/できない理由を話してくれる
  const handleNodeClick = (node) => {
    setSelectedId(node.id)
  }

  const nodeMessage = (node) => {
    const state = nodeState(skillState, node)
    const tier = getTier(skillState, node.id)
    const ofudaId = node.id.endsWith('_unlock') ? node.id.replace('_unlock', '') : null
    const desc = (ofudaId && OFUDA_TYPES[ofudaId]?.flavor) || NODE_DESC[node.id] || node.name
    const isSpirit = nodeCurrency(node) === 'spirit'
    const unit = isSpirit ? '御霊' : '通貨'
    const have = isSpirit ? skillState.spirit ?? 0 : skillState.currency
    let status
    if (state === 'maxed') status = node.id === 'root' ? '' : '(解放済みだよ)'
    else if (state === 'available') status = `(長押しで解放できるよ。${unit}${node.costs[tier]})`
    else if (state === 'locked') status = `(先に「${missingRequirementNames(skillState, node).join('」「')}」を解放してね)`
    else status = `(${unit}があと${node.costs[tier] - have}足りないよ)`
    return `【${displayName(node, skillState)}】${desc}${status}`
  }

  const handleNodePointerDown = (node, state, isRoot) => {
    setSelectedId(node.id)
    if (isRoot || state === 'maxed') return
    if (state === 'available') beginCharge(node)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          <img
            src={ASSET_PATHS.decorLantern}
            alt=""
            width={20}
            height={30}
            onError={(e) => (e.target.style.display = 'none')}
          />
          スキルツリー
        </h2>
        <div style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#c9a8ee', marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <img src={ASSET_PATHS.iconSpirit} alt="" width={18} height={18} onError={(e) => (e.target.style.display = 'none')} />
            御霊: {skillState.spirit ?? 0}
          </span>
          所持通貨: {skillState.currency}
          <img
            src={ASSET_PATHS.iconCoin}
            alt=""
            width={18}
            height={18}
            className="hud-coin-shine"
            style={{ verticalAlign: 'middle' }}
          />
        </div>
      </div>

      <div
        ref={viewportRef}
        className="ofuda-panel"
        style={{
          position: 'relative',
          border: '3px solid #5b4636',
          borderRadius: 8,
          height: 'min(46vh, 400px)',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={endViewportDrag}
        onPointerLeave={endViewportDrag}
      >
        <svg
          viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
          style={{
            width: `${zoom * 100}%`,
            display: 'block',
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            touchAction: 'none',
          }}
        >
          <defs>
            {BRANCH_GLOW.map(({ id, color }) => (
              <radialGradient id={`glow-${id}`} key={id}>
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            ))}
            {/* 紐の画像は縦横比(約6.7:1)を保ったまま繰り返して敷く。線の長さに合わせて引き延ばすと
                長い接続で潰れて見えるため */}
            {/* 1枚を左右反転した絵と交互に並べる(=つなぎ目で必ず同じ色の端が接する)ので、
                繰り返しの境目が目立たない */}
            <pattern id="thread-tile" patternUnits="userSpaceOnUse" x={0} y={-THREAD_H / 2} width={THREAD_H * THREAD_ASPECT * 2} height={THREAD_H}>
              <image href={ASSET_PATHS.uiTreeThread} width={THREAD_H * THREAD_ASPECT} height={THREAD_H} preserveAspectRatio="none" />
              <image
                href={ASSET_PATHS.uiTreeThread}
                width={THREAD_H * THREAD_ASPECT}
                height={THREAD_H}
                preserveAspectRatio="none"
                transform={`translate(${THREAD_H * THREAD_ASPECT * 2} 0) scale(-1 1)`}
              />
            </pattern>
          </defs>
          {/* 4系統それぞれの根本にほんのり色付いた光暈を敷いて、木全体が単色に見えないようにする */}
          {BRANCH_GLOW.map(({ id }) =>
            positions[id] ? <circle key={id} cx={positions[id].x} cy={positions[id].y} r={230} fill={`url(#glow-${id})`} style={{ pointerEvents: 'none' }} /> : null,
          )}
          {/* 接続線。両端とも一度でも解放済みなら、下地の直線の上に紐のテクスチャを重ねて縒り紐に見せる
              (画像が無い/読み込み前は直線だけが見える安全なフォールバック) */}
          {nodes.flatMap((node) =>
            node.requires
              .filter((r) => positions[r.id])
              .map((r) => {
                const from = positions[r.id]
                const to = positions[node.id]
                const parentUnlocked = getTier(skillState, r.id) > 0
                const bothUnlocked = parentUnlocked && getTier(skillState, node.id) > 0
                const dx = to.x - from.x
                const dy = to.y - from.y
                const dist = Math.hypot(dx, dy)
                const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
                const threadThickness = THREAD_H
                return (
                  <g key={`${r.id}->${node.id}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={bothUnlocked ? nodeColor(node) : '#a89676'}
                      strokeWidth={bothUnlocked ? 3 : 2}
                      strokeDasharray={bothUnlocked ? undefined : '6,6'}
                      opacity={bothUnlocked ? 0.85 : 0.6}
                    />
                    {/* 未解放の枝も薄い紐でつないでおく(どのノードから伸びているかが分かるように) */}
                    <rect
                      x={0}
                      y={-threadThickness / 2}
                      width={dist}
                      height={threadThickness}
                      fill="url(#thread-tile)"
                      opacity={bothUnlocked ? 1 : parentUnlocked ? 0.5 : 0.28}
                      transform={`translate(${from.x} ${from.y}) rotate(${angleDeg})`}
                      style={{ pointerEvents: 'none' }}
                    />
                    {(selectedId === node.id || selectedId === r.id) && (
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff2b8" strokeWidth={4} opacity={0.7} style={{ pointerEvents: 'none' }} />
                    )}
                  </g>
                )
              }),
          )}

          {/* ノード */}
          {nodes.map((node) => {
            const pos = positions[node.id]
            const state = nodeState(skillState, node)
            const tier = getTier(skillState, node.id)
            const color = nodeColor(node)
            const isRoot = node.group === 'root'
            const fill = state === 'maxed' ? color : state === 'locked' ? '#3a352d' : '#2c271f'
            const stroke = state === 'available' ? '#f2c14e' : state === 'maxed' ? '#7fd858' : state === 'locked' ? '#4a4438' : color
            const rawIcon = nodeIcon(node)
            // イラストが未用意(404)のノードは壊れた画像アイコンを出さず、下敷きの文字だけにする
            const icon = rawIcon && getImage(rawIcon) ? rawIcon : null
            const r = isRoot ? RADIUS + 4 : RADIUS
            const iconSize = r * 1.3
            const showBadge = node.group === 'stat' || node.group === 'ability'
            const tierLabel = node.maxTier > 1 ? `(${tier}/${node.maxTier})` : ''

            const isCharging = chargingId === node.id

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                onPointerDown={() => handleNodePointerDown(node, state, isRoot)}
                onPointerUp={cancelCharge}
                onPointerLeave={cancelCharge}
                style={{ cursor: !isRoot && state !== 'maxed' ? 'pointer' : 'default', touchAction: 'none' }}
              >
                <title>
                  {displayName(node, skillState)}
                  {isRoot
                    ? ' (最初から解放済み)'
                    : state === 'maxed'
                      ? ' - 最大まで解放済み'
                      : state === 'locked'
                        ? ` - 要: ${missingRequirementNames(skillState, node).join(', ')}`
                        : ` - コスト ${costLabel(node, tier)}${node.maxTier > 1 ? ` (${tier}/${node.maxTier}段階)` : ''}`}
                </title>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={state === 'available' || state === 'maxed' ? 3 : 2}
                  opacity={state === 'locked' ? 0.6 : 1}
                />
                {isCharging && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 6}
                    fill="none"
                    stroke="#fff6df"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * (r + 6)}
                    strokeDashoffset={(1 - chargeProgress) * 2 * Math.PI * (r + 6)}
                    transform={`rotate(-90 ${pos.x} ${pos.y})`}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* イラストが無い/読み込めない間の代わりに、札の一字を下に敷いておく(画像があれば上に隠れる) */}
                {!isRoot && (
                  <text
                    x={pos.x}
                    y={pos.y + 7}
                    textAnchor="middle"
                    fontSize={20}
                    fontWeight="bold"
                    fill={color}
                    opacity={state === 'locked' ? 0.4 : 0.9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {nodeOfudaId(node) ? OFUDA_TYPES[nodeOfudaId(node)].label : node.id.startsWith('relic') ? '珠' : node.id === ADVANCED_GATE ? '？' : node.group === 'special' ? '特' : node.id.startsWith('speed') ? '速' : ''}
                  </text>
                )}
                {icon && (
                  <image
                    href={icon}
                    x={pos.x - iconSize / 2}
                    y={pos.y - iconSize / 2}
                    width={iconSize}
                    height={iconSize}
                    opacity={state === 'locked' ? 0.5 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {showBadge && (
                  <image
                    href={ASSET_PATHS.iconUpgradeBadge}
                    x={pos.x + r * 0.25}
                    y={pos.y + r * 0.25}
                    width={r * 0.7}
                    height={r * 0.7}
                    opacity={state === 'locked' ? 0.5 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {state !== 'maxed' && !isRoot && (
                  <text x={pos.x} y={pos.y + r + 15} textAnchor="middle" fontSize="13" fill="#f0e6d2">
                    {costLabel(node, tier)}
                  </text>
                )}
                {/* 名前は短くして2行までに折り返す(長い名前が横のノードに被るため)。正式名は選択時の案内で読める */}
                {labelLines(displayName(node, skillState)).map((line, li) => (
                  <text
                    key={li}
                    x={pos.x}
                    y={pos.y + r + (state !== 'maxed' && !isRoot ? 30 : 18) + li * 13}
                    textAnchor="middle"
                    fontSize="12"
                    fill={state === 'locked' ? '#8a8171' : '#f0e6d2'}
                  >
                    {line}
                    {li === 0 && tierLabel && <tspan fill="#c9bfae"> {tierLabel}</tspan>}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ボタンを左端・案内キャラ(吹き出し+キャラ)を右端にして横一列に収め、
          縦にスクロールが発生しないようにする */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onStartRun} className="ofuda-button ofuda-button--ema">
          この周回を始める
        </button>
        {/* チュートリアル文の代わりに案内キャラに喋らせる: エラー > 通常の案内、の優先順位 */}
        <GuideMascot
          message={
            unlockError ||
            (selectedId && getNode(selectedId) ? nodeMessage(getNode(selectedId)) : null) ||
            defaultMessage ||
            '画面をドラッグすると全体を見渡せるよ。金色の縁取りのノードは長押しして解放してね。'
          }
          isError={!!unlockError}
          size={140}
          bubbleMax={320}
          fontSize={14}
        />
      </div>
    </div>
  )
}
