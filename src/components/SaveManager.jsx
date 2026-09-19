import { useState } from 'react'

// セーブの書き出し/読み込み/全消去。ブラウザのlocalStorageにしか保存していないので、
// ブラウザのデータ削除や端末変更に備えて「引き継ぎコード」で手元に控えられるようにする。
function encode(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, state }))))
}

function decode(code) {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))))
  const s = parsed?.state
  if (!s || typeof s !== 'object' || typeof s.nodeTiers !== 'object') throw new Error('bad')
  return {
    currency: Number(s.currency) || 0,
    spirit: Number(s.spirit) || 0,
    nodeTiers: { ...s.nodeTiers, root: 1 },
  }
}

export default function SaveManager({ skillState, onReplace, onReset }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [resetArmed, setResetArmed] = useState(false)

  const doExport = async () => {
    const text = encode(skillState)
    setCode(text)
    try {
      await navigator.clipboard.writeText(text)
      setNote('引き継ぎコードをコピーしたよ。メモ帳などに貼って保管してね。')
    } catch {
      setNote('下のコードを選択してコピーしてね(自動コピーはこの環境では使えなかったよ)。')
    }
  }

  const doImport = () => {
    try {
      onReplace(decode(code))
      setNote('読み込んだよ!スキルツリーに反映されたよ。')
    } catch {
      setNote('コードが正しくないみたい。書き出したコードを全部貼り付けてね。')
    }
  }

  const doReset = () => {
    if (!resetArmed) {
      setResetArmed(true)
      setTimeout(() => setResetArmed(false), 3500)
      return
    }
    setResetArmed(false)
    onReset()
    setCode('')
    setNote('全部消して、最初の状態に戻したよ。')
  }

  return (
    <div style={{ marginTop: 10, fontSize: 12 }}>
      <button onClick={() => setOpen((v) => !v)} className="ofuda-button" style={{ padding: '3px 12px', fontSize: 12, opacity: 0.8 }}>
        セーブ管理 {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid #5b4636', borderRadius: 8, background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={doExport} className="ofuda-button" style={{ padding: '4px 12px', fontSize: 12 }}>
              引き継ぎコードを書き出す
            </button>
            <button onClick={doImport} className="ofuda-button" style={{ padding: '4px 12px', fontSize: 12 }} disabled={!code.trim()}>
              このコードを読み込む
            </button>
            <button onClick={doReset} className="ofuda-button" style={{ padding: '4px 12px', fontSize: 12, marginLeft: 'auto', color: resetArmed ? '#ff9c8a' : undefined }}>
              {resetArmed ? '本当に全消去する?' : '全消去'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ここに引き継ぎコードが出るよ。読み込むときは、ここに貼り付けてね。"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, background: '#1e1a15', color: '#f0e6d2', border: '1px solid #5b4636', borderRadius: 6, padding: 6 }}
          />
          {note && <div style={{ marginTop: 6, color: '#f2c14e' }}>{note}</div>}
        </div>
      )}
    </div>
  )
}
