import { useEffect, useRef, useState } from 'react'

// 数字が瞬間切り替えではなく、じわっと目標値までカウントアップ/ダウンするようにする。
// (通貨表示などに使う想定。頻繁に変わる値なので毎回アニメが完走しなくても違和感は出ない)
export function useCountUp(target, duration = 400, initialValue) {
  const [display, setDisplay] = useState(initialValue ?? target)
  const displayRef = useRef(initialValue ?? target)
  const rafRef = useRef(null)

  useEffect(() => {
    const from = displayRef.current
    const diff = target - from
    cancelAnimationFrame(rafRef.current)
    if (diff === 0) return undefined

    let start = null
    const tick = (now) => {
      if (start == null) start = now
      const t = Math.min((now - start) / duration, 1)
      const value = Math.round(from + diff * t)
      displayRef.current = value
      setDisplay(value)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}
