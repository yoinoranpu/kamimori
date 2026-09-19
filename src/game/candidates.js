import { CANDIDATE_COUNT } from './constants.js'

// favoredOfuda: 宝珠が関係している札。プールに2枚ずつ入れて出やすくする(選んだ宝珠を活かしやすくする)
// mustInclude: 今ターンの敵に対して必要な札(例: シールド持ちの敵が出るターンの祓)。解放済みなら必ず1枚は候補に入れる。
export function drawCandidates(unlockedOfuda, favoredOfuda = null, count = CANDIDATE_COUNT, mustInclude = []) {
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
  // 必須の札も同様に保証する(基本の札の枠は潰さない)
  for (const id of mustInclude) {
    if (!unlockedOfuda.has(id) || picks.includes(id)) continue
    // 差し替える枠: 必須でも基本でもない札 → 無ければ、重複している札(基本の札の1枚目は残す)
    let slot = picks.findIndex((p) => p !== 'basic' && !mustInclude.includes(p))
    if (slot < 0) slot = picks.findIndex((p, i) => picks.indexOf(p) !== i && !mustInclude.includes(p))
    if (slot >= 0) picks[slot] = id
  }
  return picks
}
