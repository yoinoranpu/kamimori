// root(基本の札)を起点に、火・土・支援・基本強化の4本がそれぞれ独立して奥へ伸びる構成。
// 風は土の先、氷は支援の先に「一本道のご褒美」として配置している(=複数系統の合流条件は
// 使わない。合流させると解放理由が分かりにくい上、木の見た目も一方向に偏っていたため)。
// 各ノードは maxTier 段階まで同じ円のまま強化できる(見た目の省スペース化 + 課金先の分散)。
import { OFUDA_TYPES } from './constants.js'

const STORAGE_KEY = 'ofuda-td-skilltree-v3'
const ROOT_ID = 'root'
// 最初は「？？？」として表示され、御霊(章ボス撃破で得る別通貨)で開くと右側に応用編のツリーが広がる
export const ADVANCED_GATE = 'advanced_gate'
export const ADVANCED_UNLOCK_IDS = ['harai', 'cannon', 'sniper', 'poison', 'thunder', 'curse', 'koban', 'shiki']

// group: 'root' | 'unlock' | 'stat' | 'ability' | 'damage' | 'currency'
// requires: [{ id, tier? }] 形式。tier省略時は「一度でも解放(tier>=1)」を意味する。
// costs: 各段階に必要な追加コストの配列(長さ=maxTier、1段階目はcosts[0])。
export const SKILL_NODES = [
  { id: ROOT_ID, group: 'root', name: '基本の札', maxTier: 1, costs: [0], requires: [] },
  { id: ADVANCED_GATE, group: 'unlock', name: '？？？', maxTier: 1, costs: [1], currency: 'spirit', requires: [{ id: ROOT_ID }] },

  // --- 火 ---
  { id: 'fire_unlock', group: 'unlock', name: '火の札を解放', maxTier: 1, costs: [8], requires: [{ id: ROOT_ID }] },
  { id: 'fire_splash', group: 'ability', name: '火の強化:周囲に炎上を広げる', maxTier: 1, costs: [25], requires: [{ id: 'fire_unlock' }] },
  { id: 'fire_power', group: 'stat', name: '炎の玉のダメージ', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'fire_unlock' }] },
  { id: 'dmg_global', group: 'damage', name: '全体ダメージ', maxTier: 6, costs: [20, 30, 40, 55, 70, 90], requires: [{ id: 'fire_unlock' }] },

  // --- 土 ---
  { id: 'earth_unlock', group: 'unlock', name: '土の札を解放', maxTier: 1, costs: [8], requires: [{ id: ROOT_ID }] },
  { id: 'earth_catch', group: 'ability', name: '土の強化:最初の敵を捕らえる', maxTier: 1, costs: [25], requires: [{ id: 'earth_unlock' }] },
  { id: 'earth_hp', group: 'stat', name: '壁のHP', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'earth_unlock' }] },
  { id: 'wind_unlock', group: 'unlock', name: '風の札を解放', maxTier: 1, costs: [45], requires: [{ id: 'earth_hp', tier: 3 }] },
  { id: 'currency_global', group: 'currency', name: '通貨獲得', maxTier: 3, costs: [20, 30, 45], requires: [{ id: 'earth_unlock' }] },

  // --- 支援 ---
  { id: 'support_unlock', group: 'unlock', name: '支援の札を解放', maxTier: 1, costs: [8], requires: [{ id: ROOT_ID }] },
  { id: 'support_buff', group: 'stat', name: '支援効果', maxTier: 3, costs: [20, 30, 45], requires: [{ id: 'support_unlock' }] },
  { id: 'ice_unlock', group: 'unlock', name: '氷の札を解放', maxTier: 1, costs: [45], requires: [{ id: 'support_buff', tier: 3 }] },
  { id: 'support_gold', group: 'ability', name: '支援:撃破時ボーナス通貨', maxTier: 1, costs: [25], requires: [{ id: 'support_unlock' }] },
  { id: 'support_heal', group: 'ability', name: '支援:周囲の札を回復', maxTier: 1, costs: [30], requires: [{ id: 'support_unlock' }] },

  // --- 基本 ---
  { id: 'basic_boost', group: 'stat', name: '基本の札のダメージ', maxTier: 3, costs: [10, 20, 30], requires: [{ id: ROOT_ID }] },
  { id: 'basic_vs_status', group: 'ability', name: '基本:状態異常の敵に追加ダメージ', maxTier: 1, costs: [20], requires: [{ id: 'basic_boost' }] },
  { id: 'basic_fire_rate', group: 'ability', name: '基本:連射速度アップ', maxTier: 1, costs: [20], requires: [{ id: 'basic_boost' }] },
  { id: 'basic_double_shot', group: 'ability', name: '基本:時々追加の球', maxTier: 1, costs: [20], requires: [{ id: 'basic_boost' }] },

  // --- 祓(基本の札の強化を極めた先)。加護を持つ敵(第3章〜)への切り札 ---
  { id: 'harai_unlock', group: 'unlock', name: '祓の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'harai_dmg', group: 'stat', name: '祓の札の強化', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'harai_unlock' }] },
  { id: 'harai_ward', group: 'ability', name: '祓の強化:加護を剥がす時間が延びる', maxTier: 1, costs: [30], requires: [{ id: 'harai_unlock' }] },

  // --- 宝珠(章ボス撃破報酬)を強くするノード ---
  { id: 'relic_choice', group: 'unlock', name: '宝珠の選択肢が1つ増える', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'relic_reroll', group: 'ability', name: '宝珠の選択を1回引き直せる', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: 'relic_choice' }] },

  // --- 新しい札(スキルツリーの奥で解放していく) ---
  { id: 'cannon_unlock', group: 'unlock', name: '大筒の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'cannon_radius', group: 'stat', name: '大筒の強化:爆発範囲', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'cannon_unlock' }] },
  { id: 'cannon_power', group: 'stat', name: '大筒の強化:威力', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'cannon_unlock' }] },
  { id: 'cannon_knock', group: 'ability', name: '大筒の強化:爆風で敵を押し戻す', maxTier: 1, costs: [30], requires: [{ id: 'cannon_unlock' }] },
  { id: 'sniper_unlock', group: 'unlock', name: '破魔矢の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'sniper_range', group: 'stat', name: '破魔矢の強化:射程', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'sniper_unlock' }] },
  { id: 'sniper_crit', group: 'stat', name: '破魔矢の強化:会心の一撃', maxTier: 3, costs: [20, 30, 45], requires: [{ id: 'sniper_unlock' }] },
  { id: 'sniper_boss', group: 'ability', name: '破魔矢の強化:ボス・中ボスへ特攻', maxTier: 1, costs: [30], requires: [{ id: 'sniper_unlock' }] },
  { id: 'poison_unlock', group: 'unlock', name: '毒の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'poison_power', group: 'stat', name: '毒の札の強化', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'poison_unlock' }] },
  { id: 'poison_spread', group: 'ability', name: '毒の強化:倒した敵から毒が感染する', maxTier: 1, costs: [35], requires: [{ id: 'poison_unlock' }] },
  { id: 'thunder_unlock', group: 'unlock', name: '雷の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'thunder_power', group: 'stat', name: '雷の札の強化', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'thunder_unlock' }] },
  { id: 'thunder_chain', group: 'stat', name: '雷の強化:連鎖する数', maxTier: 3, costs: [20, 30, 45], requires: [{ id: 'thunder_unlock' }] },
  { id: 'curse_unlock', group: 'unlock', name: '呪の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'curse_power', group: 'stat', name: '呪の強化:呪いの重さ', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'curse_unlock' }] },
  { id: 'curse_long', group: 'ability', name: '呪の強化:呪いが長く続く', maxTier: 1, costs: [25], requires: [{ id: 'curse_unlock' }] },
  { id: 'koban_unlock', group: 'unlock', name: '小判の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'koban_amount', group: 'stat', name: '小判の強化:一度に生む額', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'koban_unlock' }] },
  { id: 'koban_rate', group: 'stat', name: '小判の強化:生む間隔', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'koban_unlock' }] },
  { id: 'shiki_unlock', group: 'unlock', name: '式神の札を解放', maxTier: 1, costs: [2], currency: 'spirit', requires: [{ id: ADVANCED_GATE }] },
  { id: 'shiki_power', group: 'stat', name: '式神の強化:力と体力', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'shiki_unlock' }] },
  { id: 'shiki_count', group: 'ability', name: '式神の強化:同時に出せる数が増える', maxTier: 1, costs: [35], requires: [{ id: 'shiki_unlock' }] },

  // --- 特殊ノード(周回の遊び方そのものが変わる。御霊で解放する) ---
  { id: 'extra_pick', group: 'special', name: '二刀流:毎ターン置ける札が1枚増える', maxTier: 1, costs: [3], currency: 'spirit', requires: [{ id: 'dmg_global', tier: 4 }] },
  { id: 'extra_candidate', group: 'special', name: '目利き:候補の札が1枚増える', maxTier: 1, costs: [3], currency: 'spirit', requires: [{ id: 'currency_global', tier: 3 }] },
  { id: 'lucky_drop', group: 'special', name: '福引:撃破時に低確率で通貨が5倍', maxTier: 1, costs: [3], currency: 'spirit', requires: [{ id: 'support_gold' }] },
  { id: 'second_chance', group: 'special', name: '不退転:防衛失敗を周回中1度だけ跳ね返す', maxTier: 1, costs: [3], currency: 'spirit', requires: [{ id: 'earth_catch' }] },
  { id: 'spirit_bonus', group: 'special', name: '御霊の導き:章ボスを倒すと御霊が+1', maxTier: 1, costs: [3], currency: 'spirit', requires: [{ id: 'basic_double_shot' }] },

  // --- 風・氷それぞれの先(既存の「強化ノード」パターンを踏襲) ---
  { id: 'wind_dmg', group: 'stat', name: '風の札の強化', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'wind_unlock' }] },
  { id: 'ice_dmg', group: 'stat', name: '氷の札の強化', maxTier: 3, costs: [15, 25, 40], requires: [{ id: 'ice_unlock' }] },
]

const NODE_MAP = Object.fromEntries(SKILL_NODES.map((n) => [n.id, n]))

export function buildNodeList() {
  return SKILL_NODES
}

// ノードの支払いに使う通貨('currency'=通常の通貨 / 'spirit'=御霊)
export function nodeCurrency(node) {
  return node.currency ?? 'currency'
}

export function getNode(id) {
  return NODE_MAP[id]
}

export function getTier(skillState, id) {
  return skillState.nodeTiers[id] ?? 0
}

function prereqsMet(skillState, node) {
  return node.requires.every((r) => getTier(skillState, r.id) >= (r.tier ?? 1))
}

// 解放済み(tier>=1)のノードから2ホップ先(子・孫)までしか見せない。
// ツリー全体を最初から出さず、掘り進めた分だけ視界が開けていく形にする。
export function computeVisibleNodeIds(skillState) {
  const children = {}
  SKILL_NODES.forEach((n) => {
    n.requires.forEach((r) => {
      children[r.id] = children[r.id] || []
      children[r.id].push(n.id)
    })
  })

  const unlockedIds = Object.keys(skillState.nodeTiers).filter((id) => skillState.nodeTiers[id] > 0)
  const visible = new Set(unlockedIds)
  let frontier = [...unlockedIds]
  for (let hop = 0; hop < 2; hop++) {
    const next = []
    for (const id of frontier) {
      // 入口「？？？」は開けるまで、その先(応用編)を見せない
      if (id === ADVANCED_GATE && getTier(skillState, id) < 1) continue
      for (const childId of children[id] || []) {
        if (!visible.has(childId)) {
          visible.add(childId)
          next.push(childId)
        }
      }
    }
    frontier = next
  }
  return visible
}

export function loadSkillState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { currency: 0, spirit: 0, nodeTiers: { [ROOT_ID]: 1 } }
    const parsed = JSON.parse(raw)
    const nodeTiers = parsed.nodeTiers ?? { [ROOT_ID]: 1 }
    if (!nodeTiers[ROOT_ID]) nodeTiers[ROOT_ID] = 1
    // 旧セーブ: 応用編の札を既に解放済みなら、入口も開けておく
    if ((ADVANCED_UNLOCK_IDS.some((id) => nodeTiers[`${id}_unlock`] > 0) || nodeTiers.relic_choice > 0 || nodeTiers.relic_reroll > 0)) nodeTiers[ADVANCED_GATE] = 1
    return { currency: parsed.currency ?? 0, spirit: parsed.spirit ?? 0, nodeTiers }
  } catch {
    return { currency: 0, spirit: 0, nodeTiers: { [ROOT_ID]: 1 } }
  }
}

export function saveSkillState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorageが使えない環境では諦める(プロトタイプなので致命的ではない)
  }
}

// 次の1段階を解放できるか(既に最大段階、前提未達、通貨不足のいずれでもfalse)
export function canUnlock(skillState, node) {
  if (node.id === ROOT_ID) return false
  const current = getTier(skillState, node.id)
  if (current >= node.maxTier) return false
  if (!prereqsMet(skillState, node)) return false
  return (skillState[nodeCurrency(node)] ?? 0) >= node.costs[current]
}

export function unlockNode(skillState, node) {
  if (!canUnlock(skillState, node)) return skillState
  const current = getTier(skillState, node.id)
  return {
    ...skillState,
    [nodeCurrency(node)]: (skillState[nodeCurrency(node)] ?? 0) - node.costs[current],
    nodeTiers: { ...skillState.nodeTiers, [node.id]: current + 1 },
  }
}

const STAT_STEP = 0.15 // 札ごとの強化ノード、1段階あたりの強化幅

export function getEffects(skillState) {
  const tier = (id) => getTier(skillState, id)
  const has = (id) => tier(id) >= 1

  const unlockedOfuda = new Set(['basic'])
  if (has('fire_unlock')) unlockedOfuda.add('fire')
  if (has('earth_unlock')) unlockedOfuda.add('earth')
  if (has('wind_unlock')) unlockedOfuda.add('wind')
  if (has('ice_unlock')) unlockedOfuda.add('ice')
  if (has('harai_unlock')) unlockedOfuda.add('harai')
  for (const id of ['cannon', 'sniper', 'poison', 'thunder', 'curse', 'koban', 'shiki']) {
    if (has(`${id}_unlock`)) unlockedOfuda.add(id)
  }
  if (has('support_unlock')) unlockedOfuda.add('support')

  const perOfudaMult = {
    basic: 1 + tier('basic_boost') * STAT_STEP,
    fire: 1 + tier('fire_power') * STAT_STEP,
    earth: 1 + tier('earth_hp') * STAT_STEP,
    wind: 1 + tier('wind_dmg') * STAT_STEP,
    ice: 1 + tier('ice_dmg') * STAT_STEP,
    harai: 1 + tier('harai_dmg') * STAT_STEP,
    cannon: 1 + tier('cannon_power') * STAT_STEP,
    poison: 1 + tier('poison_power') * STAT_STEP,
    thunder: 1 + tier('thunder_power') * STAT_STEP,
    shiki: 1 + tier('shiki_power') * STAT_STEP,
  }

  return {
    unlockedOfuda,
    globalDamageMult: 1 + tier('dmg_global') * 0.1,
    currencyMult: 1 + tier('currency_global') * 0.15,
    perOfudaMult,
    supportTier: tier('support_buff'),
    fireHasSplash: has('fire_splash'),
    earthCatch: has('earth_catch'),
    basicVsStatusBonus: has('basic_vs_status'),
    basicFireRateBonus: has('basic_fire_rate'),
    basicDoubleShot: has('basic_double_shot'),
    supportGoldBonus: has('support_gold'),
    supportHeal: has('support_heal'),
    wardBreakMult: has('harai_ward') ? 1.6 : 1,
    cannonRadiusMult: 1 + tier('cannon_radius') * 0.2,
    cannonKnockback: has('cannon_knock'),
    sniperRangeMult: 1 + tier('sniper_range') * 0.2,
    sniperCritChance: tier('sniper_crit') * 0.12,
    sniperBossMult: has('sniper_boss') ? 1.7 : 1,
    poisonSpread: has('poison_spread'),
    thunderChain: 3 + tier('thunder_chain'),
    curseBonus: 0.25 + tier('curse_power') * 0.1,
    curseLong: has('curse_long'),
    kobanMult: 1 + tier('koban_amount') * 0.5,
    kobanIntervalMult: 1 - tier('koban_rate') * 0.15,
    shikiMax: 2 + (has('shiki_count') ? 2 : 0),
    relicChoiceCount: 3 + (has('relic_choice') ? 1 : 0),
    relicRerolls: has('relic_reroll') ? 1 : 0,
    extraPick: has('extra_pick') ? 1 : 0,
    extraCandidates: has('extra_candidate') ? 1 : 0,
    luckyDrop: has('lucky_drop'),
    secondChance: has('second_chance'),
    spiritBonus: has('spirit_bonus') ? 1 : 0,
  }
}
