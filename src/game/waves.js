import { FIELD } from './constants.js'
import { getChapter } from './chapters.js'

// 出現レーンの幅をターンごとに広げる。序盤は中央付近に絞って事故を防ぎ(学習段階)、
// ターンが進むほど全高に近づいて広がり、壁による誘導・集約が効いてくるようにする。
export function getSpawnYRange(turn) {
  const center = (FIELD.spawnMinY + FIELD.spawnMaxY) / 2
  const fullHalf = (FIELD.spawnMaxY - FIELD.spawnMinY) / 2
  const t = Math.min(Math.max(turn, 1), 10)
  const spreadRatio = Math.min(0.28 + 0.08 * (t - 1), 1)
  const half = fullHalf * spreadRatio
  return { min: center - half, max: center + half }
}

const BATCH_GAP = 3.4 // 秒: 波と波の間隔
const INTRA_BATCH_GAP = 0.35 // 秒: 同じ波の中でのずらし

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 宝珠「豪雨」用: 各敵タイプの出現数を割合で増減する(端数は四捨五入、最低0)
function scaleProfile(profile, mult) {
  if (mult === 1) return profile
  const scaled = {}
  Object.entries(profile).forEach(([type, count]) => {
    scaled[type] = Math.max(0, Math.round(count * mult))
  })
  return scaled
}

function buildBatchedSpawns(profile, batchSize, startBatchIndex) {
  const { wisp: wispCount, ...combatCounts } = profile
  const types = []
  Object.entries(combatCounts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) types.push(type)
  })

  const shuffled = shuffle(types)
  const spawns = []
  let batchIndex = startBatchIndex
  shuffled.forEach((type, i) => {
    if (i > 0 && i % batchSize === 0) batchIndex += 1
    const posInBatch = i % batchSize
    const t = batchIndex * BATCH_GAP + posInBatch * INTRA_BATCH_GAP
    spawns.push({ type, t, batch: batchIndex })
  })

  // 雑霊(一撃で倒せる最弱の雑魚)は他の敵と混ぜず、専用の1バッチにまとめて
  // 密集させて出す。「敵がめちゃくちゃいる」「バサバサ倒してる」という物量の
  // 爽快感を狙う演出枠なので、薄まらないよう分離しておく。
  if (wispCount > 0) {
    batchIndex += 1
    const hordeIntraGap = 0.12 // 通常より詰めて出し、群れ感を強調する
    for (let i = 0; i < wispCount; i++) {
      spawns.push({ type: 'wisp', t: batchIndex * BATCH_GAP + i * hordeIntraGap, batch: batchIndex })
    }
  }

  return { spawns, nextBatchIndex: batchIndex + 1 }
}

export function getWaveComposition(turn, enemyCountMult = 1, chapter = 1) {
  const ch = getChapter(chapter)
  if (turn >= 10) {
    // 雑魚を出し切ってから一拍置いて章ボスが最後に登場する構成にする
    const { spawns, nextBatchIndex } = buildBatchedSpawns(scaleProfile(ch.preBoss, enemyCountMult), 6, 0)
    const bossBatch = nextBatchIndex
    spawns.push({ type: ch.bossType, t: bossBatch * BATCH_GAP + 1.2, batch: bossBatch })
    return { boss: true, spawns, batchCount: bossBatch + 1 }
  }

  const profile = scaleProfile(ch.turns[turn] ?? ch.turns[9], enemyCountMult)
  const isMilestone = ch.milestone && ch.milestone.turn === turn
  // ターン2で一気に同時対応数を増やし、うまい配置でも力押しでは抜けられない壁にする
  const batchSize = turn === 1 ? 2 : turn === 2 ? 4 : turn <= 4 ? 4 : turn <= 6 ? 5 : turn <= 8 ? 5 : 6
  const { spawns, nextBatchIndex } = buildBatchedSpawns(profile, batchSize, 0)

  if (isMilestone) {
    // 通常の敵を出し切った後で、節目のボスが最後に登場する(章ボス戦と同じ構成・ただし弱体化)
    const bossBatch = nextBatchIndex
    spawns.push({ type: ch.milestone.type, t: bossBatch * BATCH_GAP + 1.2, batch: bossBatch, hpMult: ch.milestone.hpMult })
    return { boss: true, milestone: true, spawns, batchCount: bossBatch + 1 }
  }
  return { boss: false, spawns, batchCount: nextBatchIndex }
}
