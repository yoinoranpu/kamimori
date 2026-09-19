// 初回プレイ用の案内キャラのセリフを出すかどうかの記録。ブラウザに保存する(消えても致命的ではない)。
const KEY = 'ofuda-td-tutorial-v1'

export function isTutorialDone() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true // 保存できない環境では、毎回出て邪魔になるので出さない
  }
}

export function markTutorialDone() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // 保存できなくても、その場では表示済みとして扱えれば十分
  }
}

export function resetTutorial() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 何もしない
  }
}

// 初回だけの、配置フェーズでの案内(ターン1・2のみ)。該当しなければnull。
export function tutorialSelectMessage({ turn, armed, allPlaced }) {
  if (allPlaced) return '置き終わったら「ウェーブ開始」を押してね!始まってから、倍速ボタンで早送りもできるよ。'
  if (armed) return '選んだ札を、フィールドの好きな場所を押して置いてね。スマホなら、札をそのままドラッグして置けるよ。'
  if (turn === 1) return 'ようこそ!札を1枚選んで、フィールドに置いてみよう。敵は左の鳥居から出てきて、右の本殿を目指すよ。本殿に着かれたら負けだからね。'
  return '札は毎ターン新しく配られるよ。敵の通り道に置いたり、土の札で足止めしたりして守ってね。強化は、終わった後のスキルツリーでできるよ。'
}

export const TREE_FIRST_MESSAGE =
  'はじめまして!ここが強化の木だよ。ノードを押すと説明が聞けて、通貨がたまったら長押しで解放できるんだ。まずは「この周回を始める」を押して、遊んでみよう!'
