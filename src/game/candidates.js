import { CANDIDATE_COUNT } from './constants.js'

// favoredOfuda: 宝珠が関係している札。プールに2枚ずつ入れて出やすくする(選んだ宝珠を活かしやすくする)
export function drawCandidates(unlockedOfuda, favoredOfuda = null, count = CANDIDATE_COUNT) {
  const pool = Array.from(unlockedOfuda)
  if (favoredOfuda) pool.push(...pool.filter((id) => favoredOfuda.has(id)))
  const picks = []
  for (let i = 0; i < count; i++) {
    picks.push(pool[Math.floor(Math.random() * pool.length)])
  }
  // 火・土などを解放した後、運悪く「基本の札」が候補に1枚も出ないと
  // 序盤ターンで安定した攻撃札を確保できず理不尽に負けやすくなるため、
  // 基本の札は毎ターン最低1枚は候補に入るよう保証する。
  if (!picks.includes('basic')) {
    picks[Math.floor(Math.random() * picks.length)] = 'basic'
  }
  return picks
}
