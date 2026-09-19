// 宝珠(ほうじゅ): 章ボスを撃破するたびに3択(スキルで増減)から1つ選べる、その周回限りの
// 強化。次の章からの札選び・配置の方向性を決める。周回が終わると失われる。
// スキルツリーの「地道な強化」とは別に、「一回の当たりで方向性が変わる」ローグライク的な
// 面白さを足す狙い。強化系(stat)・ルール変化系(rule)・特化系(special)の3方向性を用意している。
// ofuda: 指定があれば、その札を解放済みのときだけ候補に出る(+その札が候補に出やすくなる)
// - stat: 単純な数値強化
// - rule: 既存ルールの挙動そのものを変える(スキルツリーのアビリティ系ノードの条件を
//   外したり、クールダウンを短縮したりする)
// - special: 特定の札や、敵の耐性・弱点に特化した宝珠(選んだ札を軸に育てる方向)
// (デメリットのある宝珠は廃止した。全て純粋な強化)
export const RELIC_POOL = [
  {
    id: 'range_boost',
    category: 'stat',
    name: '疾風の宝珠',
    description: '全ての攻撃札の射程+15%',
  },
  {
    id: 'damage_boost',
    category: 'stat',
    name: '剛力の宝珠',
    description: '全体ダメージ+25%',
  },
  {
    id: 'hp_boost',
    category: 'stat',
    name: '頑健の宝珠',
    description: '全てのお札・壁のHP+25%',
  },
  {
    id: 'fire_rate_boost',
    category: 'stat',
    name: '俊敏の宝珠',
    description: '全ての攻撃札の連射速度+12%',
  },
  {
    id: 'earth_double_catch',
    ofuda: 'earth',
    category: 'rule',
    name: '双牢の宝珠',
    description: '土壁が同時に2体まで敵を捕らえられるようになる',
  },
  {
    id: 'support_heal_freq',
    ofuda: 'support',
    category: 'rule',
    name: '常温の宝珠',
    description: '支援札の回復間隔が大幅に短くなり、ほぼ毎ターン発動する',
  },
  {
    id: 'fire_always_splash',
    ofuda: 'fire',
    category: 'rule',
    name: '陽炎の宝珠',
    description: '火の強化が未解放でも、直撃した相手の周囲に炎上が広がるようになる',
  },
  {
    id: 'support_gold_always',
    ofuda: 'support',
    category: 'rule',
    name: '百花の宝珠',
    description: '支援:撃破時ボーナス通貨が、支援の強化が未解放でも常に発動する',
  },
  {
    id: 'more_enemies_more_gold',
    category: 'stat',
    name: '恵雨の宝珠',
    description: '撃破時に獲得する通貨+40%',
  },
  {
    id: 'head_start',
    category: 'stat',
    name: '開幕の宝珠',
    description: '選んだ瞬間に通貨+100をもらえる',
  },
  // ---- 特定の札に強い宝珠 ----
  { id: 'fire_master', category: 'special', ofuda: 'fire', name: '紅蓮の宝珠', description: '火の札のダメージ+50%' },
  { id: 'basic_master', category: 'special', ofuda: 'basic', name: '一文字の宝珠', description: '基本の札のダメージ+60%' },
  { id: 'earth_master', category: 'special', ofuda: 'earth', name: '岩戸の宝珠', description: '土壁のHP+60%' },
  { id: 'wind_master', category: 'rule', ofuda: 'wind', name: '颪の宝珠', description: '風の札のダメージ+50%、吹き飛ばし時間+60%' },
  { id: 'ice_master', category: 'rule', ofuda: 'ice', name: '霜降の宝珠', description: '氷の札のダメージ+50%、鈍足の強さ+25%' },
  { id: 'harai_master', category: 'rule', ofuda: 'harai', name: '清祓の宝珠', description: '祓の札のダメージ+50%、シールドへのダメージが2.5倍' },
  { id: 'support_master', category: 'special', ofuda: 'support', name: '結縁の宝珠', description: '支援効果が1段階強化される' },
  { id: 'cannon_master', category: 'special', ofuda: 'cannon', name: '轟の宝珠', description: '大筒の札のダメージ+40%、爆発範囲+30%' },
  { id: 'poison_master', category: 'rule', ofuda: 'poison', name: '瘴気の宝珠', description: '毒の札のダメージ+50%、毒の感染が未解放でも常に発動する' },
  { id: 'thunder_master', category: 'rule', ofuda: 'thunder', name: '迅雷の宝珠', description: '雷の札の連鎖数+3、ダメージ+30%' },
  { id: 'curse_master', category: 'rule', ofuda: 'curse', name: '怨念の宝珠', description: '呪いの重さ+25%、呪いが長く続く' },
  { id: 'sniper_master', category: 'special', ofuda: 'sniper', name: '鷹の目の宝珠', description: '破魔矢の会心率+25%、射程+30%' },
  { id: 'koban_master', category: 'special', ofuda: 'koban', name: '福の宝珠', description: '小判が生む額が2倍になる' },
  { id: 'shiki_master', category: 'rule', ofuda: 'shiki', name: '百鬼夜行の宝珠', description: '式神を同時に+3体まで出せる、式神の力+40%' },
  // ---- 敵の耐性・弱点に関わる宝珠 ----
  { id: 'ignore_resist', category: 'special', name: '無我の宝珠', description: '敵の耐性を無視する(風が効かない岩、氷が効かない雪女にも通る)' },
  { id: 'weak_boost', category: 'special', name: '看破の宝珠', description: '敵の弱点を突いた時のダメージが大きく伸びる' },
]

const RELIC_MAP = Object.fromEntries(RELIC_POOL.map((r) => [r.id, r]))

export function getRelic(id) {
  return RELIC_MAP[id]
}

// 所持済みを除いた中からランダムにn個(重複無し)提示する
export function pickRelicChoices(ownedIds, count = 3, unlockedOfuda = null) {
  const pool = RELIC_POOL.filter(
    (r) => !ownedIds.includes(r.id) && (!r.ofuda || !unlockedOfuda || unlockedOfuda.has(r.ofuda)),
  )
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// スキルツリーのgetEffects()が返すベース効果に、所持している宝珠の効果を重ねて最終的な
// 効果一覧を作る。宝珠側は「無ければ何もしない(デフォルト値)」を徹底し、既存のエンジン
// コードは宝珠の存在を意識しなくて済むようにする。
export function applyRelicEffects(baseEffects, relicIds) {
  const has = (id) => relicIds.includes(id)
  const effects = {
    ...baseEffects,
    rangeMult: 1,
    towerHpMult: 1,
    wallHpMult: 1,
    intervalMult: 1,
    wallCatchCharges: 1,
    supportHealIntervalMult: 1,
    enemyCountMult: 1,
    towerDamageTakenMult: 1,
    dropChanceMult: 1,
    startingCurrencyBonus: 0,
    knockbackMult: 1,
    iceSlowRatioAdd: 0,
    wardBreakMult: baseEffects.wardBreakMult ?? 1,
    ignoreResist: false,
    weakBoost: 0,
    perOfudaMult: { ...baseEffects.perOfudaMult },
  }

  if (has('range_boost')) effects.rangeMult *= 1.15
  if (has('damage_boost')) effects.globalDamageMult *= 1.25
  if (has('hp_boost')) effects.towerHpMult *= 1.25
  if (has('fire_rate_boost')) effects.intervalMult *= 0.88
  if (has('earth_double_catch')) {
    effects.wallCatchCharges = 2
    effects.earthCatch = true
  }
  if (has('support_heal_freq')) {
    effects.supportHealIntervalMult *= 0.35
    effects.supportHeal = true
  }
  if (has('fire_always_splash')) effects.fireHasSplash = true
  if (has('support_gold_always')) effects.supportGoldBonus = true
  if (has('more_enemies_more_gold')) effects.currencyMult *= 1.4

  const mulOfuda = (id, m) => {
    effects.perOfudaMult[id] = (effects.perOfudaMult[id] ?? 1) * m
  }
  if (has('fire_master')) mulOfuda('fire', 1.5)
  if (has('basic_master')) mulOfuda('basic', 1.6)
  if (has('earth_master')) effects.wallHpMult *= 1.6
  if (has('wind_master')) {
    mulOfuda('wind', 1.5)
    effects.knockbackMult *= 1.6
  }
  if (has('ice_master')) {
    mulOfuda('ice', 1.5)
    effects.iceSlowRatioAdd += 0.25
  }
  if (has('harai_master')) {
    mulOfuda('harai', 1.5)
    effects.wardBreakMult *= 2.5
  }
  if (has('cannon_master')) {
    mulOfuda('cannon', 1.4)
    effects.cannonRadiusMult = (effects.cannonRadiusMult ?? 1) * 1.3
  }
  if (has('poison_master')) {
    mulOfuda('poison', 1.5)
    effects.poisonSpread = true
  }
  if (has('thunder_master')) {
    mulOfuda('thunder', 1.3)
    effects.thunderChain = (effects.thunderChain ?? 3) + 3
  }
  if (has('curse_master')) {
    effects.curseBonus = (effects.curseBonus ?? 0.25) + 0.25
    effects.curseLong = true
  }
  if (has('sniper_master')) {
    effects.sniperCritChance = (effects.sniperCritChance ?? 0) + 0.25
    effects.sniperRangeMult = (effects.sniperRangeMult ?? 1) * 1.3
  }
  if (has('koban_master')) effects.kobanMult = (effects.kobanMult ?? 1) * 2
  if (has('shiki_master')) {
    effects.shikiMax = (effects.shikiMax ?? 2) + 3
    mulOfuda('shiki', 1.4)
  }
  if (has('support_master')) effects.supportTier = Math.min(4, (effects.supportTier ?? 0) + 1)
  if (has('ignore_resist')) effects.ignoreResist = true
  if (has('weak_boost')) effects.weakBoost = 1.8

  return effects
}

// 宝珠に関連する札が候補に出やすくなるよう、対象札の一覧を返す(候補抽選の重み付け用)
export function getFavoredOfuda(relicIds) {
  return new Set(relicIds.map((id) => RELIC_MAP[id]?.ofuda).filter(Boolean))
}
