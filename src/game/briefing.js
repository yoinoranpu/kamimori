// 案内キャラが配置フェーズに話す、敵の弱点・耐性の解説文を作る。
// 「今ターン来る敵のうち、特性があるものを最大2種」を優先度順に拾って喋らせる。
import { getWaveComposition } from './waves.js'
import { ENEMY_TYPES, OFUDA_TYPES } from './constants.js'

const nameOf = (kind) => OFUDA_TYPES[kind]?.name ?? kind

function affinityKinds(def) {
  const weak = []
  const resist = []
  const immune = []
  Object.entries(def.affinity ?? {}).forEach(([kind, mult]) => {
    if (!OFUDA_TYPES[kind]) return
    if (mult > 1) weak.push(kind)
    else if (mult <= 0.3) immune.push(kind)
    else if (mult < 1) resist.push(kind)
  })
  return { weak, resist, immune }
}

function hasTraits(def) {
  const a = affinityKinds(def)
  return a.weak.length + a.resist.length + a.immune.length > 0 || def.ward || def.knockbackImmune || def.slowImmune
}

// 敵1種類ぶんの解説(1〜2文)
function describeEnemy(def) {
  const { weak, resist, immune } = affinityKinds(def)
  const parts = []
  if (weak.length) parts.push(`${weak.map(nameOf).join('と')}が効くよ`)
  if (immune.length) parts.push(`${immune.map(nameOf).join('と')}はほぼ効かないよ`)
  else if (resist.length) parts.push(`${resist.map(nameOf).join('と')}は効きにくいよ`)
  if (def.ward) parts.push('加護持ちだから、祓の札で守りを剥がしてね')
  // 風・氷が「効かない」と既に言っている時は、吹き飛ばし/鈍足無効の重ね書きを省く
  if (def.knockbackImmune && !immune.includes('wind')) parts.push('風で吹き飛ばせないよ')
  if (def.slowImmune && !immune.includes('ice')) parts.push('氷で鈍らせられないよ')
  return `${def.name}は${parts.join('。')}。`
}

// 今ターンの敵の紹介。特性のある敵が1種もいなければnull(=通常の案内文を使う)。
export function describeWave(chapter, turn, enemyCountMult = 1) {
  const comp = getWaveComposition(turn, enemyCountMult, chapter)
  const counts = {}
  comp.spawns.forEach((s) => {
    counts[s.type] = (counts[s.type] ?? 0) + 1
  })
  const notable = Object.keys(counts)
    .map((type) => ENEMY_TYPES[type])
    .filter(hasTraits)
    .sort((a, b) => Number(b.isBoss ?? 0) - Number(a.isBoss ?? 0) || Number(b.isMidBoss ?? 0) - Number(a.isMidBoss ?? 0))
    .slice(0, 2)
  if (notable.length === 0) return null
  return `今ターンは${notable.map((d) => d.name).join('と')}が来るよ。${notable.map(describeEnemy).join('')}`
}

// 選んでいる札が、今ターンの敵に対して有利か不利かを一言で返す(無関係ならnull)
export function armedHint(typeId, chapter, turn, enemyCountMult = 1) {
  const comp = getWaveComposition(turn, enemyCountMult, chapter)
  const types = [...new Set(comp.spawns.map((s) => s.type))].map((t) => ENEMY_TYPES[t])
  const good = types.filter((d) => (d.affinity?.[typeId] ?? 1) > 1 || (typeId === 'harai' && d.ward))
  const bad = types.filter((d) => (d.affinity?.[typeId] ?? 1) < 1)
  const bits = []
  if (good.length) bits.push(`今ターンの${good.map((d) => d.name).join('・')}に効くよ!`)
  if (bad.length) bits.push(`${bad.map((d) => d.name).join('・')}には効きにくいかも…`)
  return bits.length ? bits.join(' ') : null
}
