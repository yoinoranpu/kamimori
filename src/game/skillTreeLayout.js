// スキルツリーのノード配置を、root(基本の札)を中心に放射状(2D)へ自動計算する。
// 深さ(rootからのホップ数)を半径に、系統(どの初期分岐から伸びているか)を角度にする。
import { SKILL_NODES, ADVANCED_GATE } from './skillTree.js'

const RADIUS_STEP = 125
const SIBLING_SPREAD_DEG = 24

// 主要4分岐の基準角度(度)。0=右, 90=下, -90=上。root(中央)から均等な十字方向へ広げる。
// 風・氷はそれぞれ土・支援の一本道の先にぶら下がる単一継承ノードなので、
// 個別の固定角度を持たせなくても親の角度をそのまま引き継いで自然に揃う。
const BRANCH_BASE_ANGLE = {
  fire_unlock: -135,
  earth_unlock: -45,
  support_unlock: 45,
  basic_boost: 135,
}

function computeDepths(nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const depth = {}
  function getDepth(id) {
    if (depth[id] != null) return depth[id]
    const n = byId[id]
    if (n.requires.length === 0) return (depth[id] = 0)
    depth[id] = Math.max(...n.requires.map((r) => getDepth(r.id))) + 1
    return depth[id]
  }
  nodes.forEach((n) => getDepth(n.id))
  return depth
}

function computeAngles(nodes, depth) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const angle = {}

  function getAngle(id) {
    if (angle[id] != null) return angle[id]
    if (BRANCH_BASE_ANGLE[id] != null) return (angle[id] = BRANCH_BASE_ANGLE[id])
    const n = byId[id]
    if (n.requires.length === 0) return (angle[id] = 0)
    const parentAngles = n.requires.map((r) => getAngle(r.id))
    angle[id] = parentAngles.reduce((a, b) => a + b, 0) / parentAngles.length
    return angle[id]
  }
  nodes.forEach((n) => getAngle(n.id))

  // 同じ深さ・同じ親集合を持つ兄弟ノード同士は、重ならないよう角度をずらす。
  // ただし固定の基準角度を持つ初期分岐(BRANCH_BASE_ANGLE)はここで上書きしない。
  const groups = {}
  nodes.forEach((n) => {
    if (n.requires.length === 0 || BRANCH_BASE_ANGLE[n.id] != null) return
    const key = `${depth[n.id]}_${n.requires.map((r) => r.id).join(',')}`
    groups[key] = groups[key] || []
    groups[key].push(n.id)
  })
  Object.values(groups).forEach((ids) => {
    if (ids.length < 2) return
    const base = angle[ids[0]]
    ids.forEach((id, i) => {
      angle[id] = base + (i - (ids.length - 1) / 2) * SIBLING_SPREAD_DEG
    })
  })

  return angle
}

// 応用編(入口の「？？？」以降)は、既存の放射状ツリーの右側に、「？？？」を中心にした環状に
// まとめる。内側の輪に札の解放ノード、その外側に各札の強化ノードを扇状に置く。
const ADV_RING_1 = 205
const ADV_RING_2 = 520
const ADV_UPGRADE_SPREAD_DEG = 10

function layoutAdvanced(raw) {
  const advanced = new Set([ADVANCED_GATE])
  let grew = true
  while (grew) {
    grew = false
    SKILL_NODES.forEach((n) => {
      if (!advanced.has(n.id) && n.requires.some((r) => advanced.has(r.id))) {
        advanced.add(n.id)
        grew = true
      }
    })
  }
  // 既存ツリーの右端より十分右へ置く(輪の左半分が火・土・支援の枝と重ならないように)
  const restXs = SKILL_NODES.filter((n) => !advanced.has(n.id)).map((n) => raw[n.id].x)
  const gateX = Math.max(...restXs) + ADV_RING_2 + 190
  raw[ADVANCED_GATE] = { x: gateX, y: 0 }

  const unlocks = SKILL_NODES.filter((n) => n.requires.some((r) => r.id === ADVANCED_GATE))
  // 真左(root方向)は入口へ続く紐の通り道なので、その左右30度は空け、残りの300度に並べる
  const step = 300 / unlocks.length
  const startDeg = 180 + 30 + step / 2
  unlocks.forEach((u, i) => {
    const deg = startDeg + i * step
    const rad = (deg * Math.PI) / 180
    raw[u.id] = { x: gateX + ADV_RING_1 * Math.cos(rad), y: ADV_RING_1 * Math.sin(rad) }
    const ups = SKILL_NODES.filter((n) => n.requires.some((r) => r.id === u.id))
    ups.forEach((up, j) => {
      const d = deg + (j - (ups.length - 1) / 2) * ADV_UPGRADE_SPREAD_DEG
      const r2 = (d * Math.PI) / 180
      raw[up.id] = { x: gateX + ADV_RING_2 * Math.cos(r2), y: ADV_RING_2 * Math.sin(r2) }
    })
  })
  return advanced
}

// 特殊ノード(group:'special')は既存の放射状の深さ・角度では他のノードと重なるので、親の外側
// の「空いている場所」を探して個別に置く。ノード同士、そして接続線がどのノードにも重ならない
// 最初の位置を採用する。
function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function advancedNodeIds() {
  const advanced = new Set([ADVANCED_GATE])
  let grew = true
  while (grew) {
    grew = false
    SKILL_NODES.forEach((n) => {
      if (!advanced.has(n.id) && n.requires.some((r) => advanced.has(r.id))) {
        advanced.add(n.id)
        grew = true
      }
    })
  }
  return advanced
}

function layoutSpecials(raw) {
  const specials = SKILL_NODES.filter((n) => n.group === 'special')
  // 応用編のノードはこの時点ではまだ仮の位置なので、判定から除く
  const advanced = advancedNodeIds()
  const base = SKILL_NODES.filter((n) => n.group !== 'special' && !advanced.has(n.id))
  const placedIds = base.map((n) => n.id)
  const edges = []
  base.forEach((n) => n.requires.forEach((r) => edges.push([r.id, n.id])))
  specials.forEach((sp) => {
    const parentId = sp.requires[0].id
    const parent = raw[parentId]
    const outward = Math.atan2(parent.y, parent.x)
    const offsets = [0]
    for (let d = 15; d <= 180; d += 15) offsets.push(d, -d)
    for (const dist of [RADIUS_STEP, RADIUS_STEP * 1.25, RADIUS_STEP * 1.5, RADIUS_STEP * 1.9, RADIUS_STEP * 2.3, RADIUS_STEP * 2.7]) {
      for (const off of offsets) {
        const a = outward + (off * Math.PI) / 180
        const cand = { x: parent.x + Math.cos(a) * dist, y: parent.y + Math.sin(a) * dist }
        const nodesOk = placedIds.every((id) => Math.hypot(raw[id].x - cand.x, raw[id].y - cand.y) >= 100)
        const edgesOk = edges.every(([f, t]) => distToSegment(cand, raw[f], raw[t]) >= 58)
        const ownOk = placedIds.every((id) => id === parentId || distToSegment(raw[id], parent, cand) >= 52)
        if (nodesOk && edgesOk && ownOk) {
          raw[sp.id] = cand
          placedIds.push(sp.id)
          edges.push([parentId, sp.id])
          return
        }
      }
    }
    // 見つからなければ親のすぐ外側(最後の手段)
    raw[sp.id] = { x: parent.x + Math.cos(outward) * RADIUS_STEP, y: parent.y + Math.sin(outward) * RADIUS_STEP }
    placedIds.push(sp.id)
  })
}

// ノードの占有領域(円 + その下の名前ラベル)同士が重ならないよう、重なりを解消する方向へ
// 少しずつ押し離す。放射状の配置だけでは、同じ親の兄弟が近くに並んでラベルが横のノードに被る。
// rootだけは動かさない(中心の基準)。押し離した結果が接続線と衝突しないかは別途確認している。
const FOOT_HALF_W = 54
const FOOT_TOP = 38
const FOOT_BOTTOM = 34 + 52

function relaxOverlaps(raw) {
  const ids = Object.keys(raw)
  for (let iter = 0; iter < 400; iter++) {
    let moved = false
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = raw[ids[i]]
        const b = raw[ids[j]]
        const overlapX = FOOT_HALF_W * 2 - Math.abs(a.x - b.x)
        // 縦方向は上下で範囲が非対称(下にラベルがある)ので、上にある方の下端と下にある方の上端で判定
        const upper = a.y <= b.y ? a : b
        const lower = a.y <= b.y ? b : a
        const overlapY = upper.y + FOOT_BOTTOM - (lower.y - FOOT_TOP)
        if (overlapX <= 0 || overlapY <= 0) continue
        moved = true
        const idA = ids[i]
        const idB = ids[j]
        const fixedA = idA === 'root'
        const fixedB = idB === 'root'
        if (overlapX < overlapY) {
          const dir = a.x <= b.x ? -1 : 1
          const push = overlapX / 2 + 0.5
          if (!fixedA) a.x += dir * push * (fixedB ? 2 : 1)
          if (!fixedB) b.x -= dir * push * (fixedA ? 2 : 1)
        } else {
          const aIsUpper = a.y <= b.y
          const push = overlapY / 2 + 0.5
          if (!fixedA) a.y += (aIsUpper ? -1 : 1) * push * (fixedB ? 2 : 1)
          if (!fixedB) b.y += (aIsUpper ? 1 : -1) * push * (fixedA ? 2 : 1)
        }
      }
    }
    if (!moved) break
  }
}

function buildLayout() {
  const depth = computeDepths(SKILL_NODES)
  const angle = computeAngles(SKILL_NODES, depth)

  const raw = {}
  SKILL_NODES.forEach((n) => {
    const r = depth[n.id] * RADIUS_STEP
    const rad = (angle[n.id] * Math.PI) / 180
    raw[n.id] = { x: r * Math.cos(rad), y: r * Math.sin(rad) }
  })
  layoutSpecials(raw)
  layoutAdvanced(raw)
  relaxOverlaps(raw)

  const margin = 115
  const xs = Object.values(raw).map((p) => p.x)
  const ys = Object.values(raw).map((p) => p.y)
  const minX = Math.min(...xs) - margin
  const maxX = Math.max(...xs) + margin
  const minY = Math.min(...ys) - margin
  const maxY = Math.max(...ys) + margin

  const positions = {}
  Object.entries(raw).forEach(([id, p]) => {
    positions[id] = { x: p.x - minX, y: p.y - minY }
  })

  return {
    positions,
    viewBox: { x: 0, y: 0, w: maxX - minX, h: maxY - minY },
  }
}

export const SKILL_TREE_LAYOUT = buildLayout()
