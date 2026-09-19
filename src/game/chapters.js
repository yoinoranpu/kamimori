// 章(階)ごとの設定。1周回は第1章→第2章→第3章と進み、各章の10ターン目が章ボス戦。
// 章ボスを倒すと宝珠を1つ選び、フィールドは新しい章の状態にリセットされる(お札は持ち越さない)。
// 数値は全て仮。章が進むほど敵が硬くなり、宝珠の選択が攻略の方向性を決める。
export const CHAPTERS = {
  1: {
    name: '第一章',
    subtitle: '社の参道',
    hpMult: 1,
    bossType: 'aramitama',
    tint: null,
    preBoss: { onibi: 10, oonyudo: 2, kamaitachi: 3, wisp: 10 },
    // 企画書ベースのペース表(詳細はwaves.jsの旧コメント参照)
    turns: {
      1: { onibi: 5 },
      2: { onibi: 4, oonyudo: 1 },
      3: { onibi: 6, oonyudo: 1, wisp: 8 },
      4: { onibi: 10, oonyudo: 2 },
      5: { onibi: 7, oonyudo: 1, kamaitachi: 1 },
      6: { onibi: 8, wisp: 14 },
      7: { onibi: 9, oonyudo: 3, kamaitachi: 2 },
      8: { onibi: 8, kamaitachi: 1, wisp: 12 },
      9: { onibi: 10, oonyudo: 3, kamaitachi: 3, wisp: 8 },
    },
  },
  2: {
    name: '第二章',
    subtitle: '雪の峠',
    hpMult: 1.4,
    bossType: 'koorihime',
    // 章の途中に「前の章のボス」が再登場する節目。倒せば宝珠と御霊がその場でもらえるので、
    // 章ボスまで届かなくてもここで報酬を持ち帰れる(やり直しのストレスを減らすため)
    milestone: { turn: 5, type: 'aramitama', hpMult: 0.6, name: '荒魂' },
    tint: 'rgba(190, 220, 255, 0.20)',
    preBoss: { onibi: 8, yukionna: 8, iwakuronushi: 2, kamaitachi: 3, wisp: 10 },
    turns: {
      1: { onibi: 4, yukionna: 3 },
      2: { onibi: 5, yukionna: 3, oonyudo: 1 },
      3: { yukionna: 6, wisp: 10, kamaitachi: 1 },
      4: { onibi: 6, yukionna: 4, iwakuronushi: 1 },
      5: { kamaitachi: 3, yukionna: 5, oonyudo: 1 },
      6: { onibi: 4, yukionna: 6, wisp: 16 },
      7: { iwakuronushi: 2, yukionna: 6, kamaitachi: 3 },
      8: { onibi: 8, yukionna: 6, kamaitachi: 2, wisp: 12 },
      9: { yukionna: 8, iwakuronushi: 2, kamaitachi: 3, oonyudo: 2, wisp: 8 },
    },
  },
  3: {
    name: '第三章',
    subtitle: '黄泉の底',
    hpMult: 1.9,
    bossType: 'magatsuhi',
    tint: 'rgba(70, 20, 90, 0.26)',
    preBoss: { kasha: 6, kitsune: 6, nurikabe: 2, kamaitachi: 3, wisp: 10 },
    turns: {
      1: { kitsune: 4, onibi: 4 },
      2: { kasha: 3, kitsune: 3 },
      3: { wisp: 14, kitsune: 4, kasha: 2 },
      4: { nurikabe: 1, kitsune: 5, onibi: 5 },
      5: { kasha: 4, kitsune: 4, kamaitachi: 2 },
      6: { wisp: 18, kasha: 4, kitsune: 4 },
      7: { nurikabe: 2, kasha: 4, kitsune: 5 },
      8: { yukionna: 4, kasha: 5, kitsune: 5, wisp: 10 },
      9: { nurikabe: 2, kasha: 6, kitsune: 6, iwakuronushi: 1, wisp: 8 },
    },
  },
}

export function getChapter(n) {
  return CHAPTERS[n] ?? CHAPTERS[1]
}
