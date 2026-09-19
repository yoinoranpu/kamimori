import {
  FIELD,
  OFUDA_TYPES,
  ENEMY_TYPES,
  PROJECTILE_SPEED,
  BASE_SPEED,
  WALL_ATTACK_MULT,
  BASE_WALL_ATTACK_DPS,
  CARD_SLASH_DPS,
  CARD_SLASH_RADIUS,
  ENEMY_HP_SCALE_PER_TURN,
  BOSS_PHASE_INTERVAL,
  BOSS_AOE_RADIUS,
  BOSS_AOE_DAMAGE,
  BOSS_SUMMON_COUNT,
  BOSS_ENTRANCE_SECONDS,
  KNOCKBACK_IMMUNITY_SECONDS,
  CURRENCY_DROP_SCALE,
} from './constants.js'
import { getWaveComposition, getSpawnYRange } from './waves.js'
import { getChapter } from './chapters.js'
import { MAX_CHAPTER } from './constants.js'
import { WALL_SPAN_PX } from './grid.js'
import { ASSET_PATHS, pickRandom } from './assets.js'

let idSeq = 1
const nextId = () => idSeq++

const HONDEN_RADIUS = 40
// 壁のこれくらい手前まで直進してきたら、初めてその存在に気づいて迂回を始める
// (=遠くからでも壁を避けたルートを取ることはない、という局所的な回避)
const WALL_DETECT_AHEAD = 40
// 密集しすぎた敵同士を引き離す力の強さ(px/秒基準)
const SEPARATION_PUSH = 120
// 土の「最初の敵を捕らえる」: 雑魚は完全停止、ボスは少しの間だけ大幅減速に留める
const EARTH_CATCH_ROOT_SECONDS = 3
const EARTH_CATCH_BOSS_SLOW_SECONDS = 2
const EARTH_CATCH_BOSS_SLOW_RATIO = 0.7
// 基本札「時々追加の球」の発生確率と、その球の威力(通常の何倍か)
const DOUBLE_SHOT_CHANCE = 0.3
const DOUBLE_SHOT_DAMAGE_MULT = 0.5
// 基本札「状態異常の敵に追加ダメージ」の倍率
const STATUS_BONUS_MULT = 1.5
// 支援札「周囲の札を回復する球」の間隔と回復量
const SUPPORT_HEAL_INTERVAL = 4
const SUPPORT_HEAL_AMOUNT = 8
// 支援札「撃破時ボーナス通貨」の倍率
const SUPPORT_GOLD_BONUS_MULT = 1.5

export function createRunState() {
  return {
    chapter: 1,
    chapterCleared: false, // 第1・2章のボスを倒した瞬間だけtrue(App側が宝珠選択→次章へ進める)
    turn: 1,
    towers: [],
    enemies: [],
    projectiles: [],
    secondChanceUsed: false, // 宝珠でなくスキル「不退転」: 周回中1度だけ本殿到達を跳ね返す
    minions: [], // 式神の札が呼び出す小型の味方
    fx: [],
    spawnQueue: [],
    waveClock: 0,
    waveActive: false,
    waveCleared: false,
    isBossWave: false,
    bossState: null,
    currencyThisRun: 0,
    kills: 0,
    currentBatch: -1,
    totalBatches: 0,
    outcome: null, // null | 'cleared' | 'defeated'
    screenShake: { magnitude: 0, timeLeft: 0 },
    hitStop: 0, // ボス/中ボスへの一撃・撃破の瞬間だけ一瞬シミュレーションを止め、重みを出す演出用
  }
}

// 新しい章の開始: お札・敵・弾をすべて片付け、ターン1からやり直す(通貨・撃破数は持ち越し)
export function startChapter(state, chapter) {
  state.chapter = chapter
  state.chapterCleared = false
  state.turn = 1
  state.towers = []
  state.enemies = []
  state.projectiles = []
  state.minions = []
  state.fx = []
  state.spawnQueue = []
  state.waveClock = 0
  state.waveActive = false
  state.waveCleared = false
  state.isBossWave = false
  state.bossState = null
  state.currentBatch = -1
  state.totalBatches = 0
  state.outcome = null
}

// 敵の耐性/弱点(affinity)。宝珠「無我」は耐性を無視し、「看破」は弱点の効きを強める。
function affinityMult(def, kind, effects) {
  let a = def.affinity?.[kind] ?? 1
  if (a < 1 && effects?.ignoreResist) a = 1
  if (a > 1 && effects?.weakBoost) a = 1 + (a - 1) * effects.weakBoost
  return a
}

export function placeTower(state, x, y, typeId, skillEffects) {
  if (state.outcome) return false
  const tooClose = state.towers.some((t) => Math.hypot(t.x - x, t.y - y) < 36)
  if (tooClose) return false
  const def = OFUDA_TYPES[typeId]
  const hpMult = skillEffects?.perOfudaMult?.[typeId] ?? 1
  const isWall = def.kind === 'wall'
  // 宝珠「頑健」(全お札HP+)と「焦土」(壁HP-)は掛け合わせで反映する
  const relicHpMult = (skillEffects?.towerHpMult ?? 1) * (isWall ? skillEffects?.wallHpMult ?? 1 : 1)
  const finalHp = def.hp * (isWall ? hpMult : 1) * relicHpMult
  state.towers.push({
    id: nextId(),
    type: typeId,
    x,
    y,
    // 小判・式神は「置いてから最初の1周期」を待ってから働き始める
    cooldown: def.kind === 'economy' || def.kind === 'summon' ? def.interval : 0,
    targetId: null,
    hp: finalHp,
    maxHp: finalHp,
    fireFlash: 0, // 発射した瞬間だけ跳ねさせる演出用タイマー
    placedFlash: 0.25, // 配置した瞬間だけ大きく跳ねてから収まる着地演出用タイマー
    // 土の「最初の敵を捕らえる」: 壁1枚・1ターンにつき1回(宝珠「双牢」で2回になる)
    catchCharges: isWall ? (skillEffects?.wallCatchCharges ?? 1) : 0,
    healCooldown: SUPPORT_HEAL_INTERVAL, // 支援の「周囲を回復する球」用タイマー
  })
  return true
}

export function startWave(state, turn, skillEffects) {
  const comp = getWaveComposition(turn, skillEffects?.enemyCountMult ?? 1, state.chapter ?? 1)
  state.turn = turn
  state.minions = []
  state.spawnQueue = comp.spawns.map((s) => ({ ...s }))
  state.waveClock = 0
  state.waveActive = true
  state.waveCleared = false
  state.isBossWave = comp.boss
  state.isMilestoneWave = !!comp.milestone
  state.milestoneCleared = false
  state.bossState = comp.boss ? { phaseTimer: 0, phaseIndex: 0 } : null
  state.currentBatch = -1
  state.totalBatches = comp.batchCount ?? 1
  // 土の捕獲罠は1ターンにつき既定回数(宝珠「双牢」で2回)、ウェーブ開始のたびに再チャージされる
  const catchCharges = skillEffects?.wallCatchCharges ?? 1
  for (const t of state.towers) {
    if (OFUDA_TYPES[t.type].kind === 'wall') t.catchCharges = catchCharges
  }
}

function spawnEnemy(state, typeId, xOverride, yOverride, hpMult = 1) {
  const def = ENEMY_TYPES[typeId]
  // ボスは固有の調整値を持つのでスケーリング対象外。雑魚はターンが進むほど硬くなる。
  const hpScale =
    def.isBoss || def.noScale ? 1 : (1 + (state.turn - 1) * ENEMY_HP_SCALE_PER_TURN) * getChapter(state.chapter ?? 1).hpMult
  const hp = def.hp * hpScale * hpMult
  const spawnRange = getSpawnYRange(state.turn)
  state.enemies.push({
    id: nextId(),
    type: typeId,
    x: xOverride ?? FIELD.toriiX,
    y: yOverride ?? spawnRange.min + Math.random() * (spawnRange.max - spawnRange.min),
    hp,
    maxHp: hp,
    slowTimeLeft: 0,
    slowRatio: 0,
    knockbackTimeLeft: 0,
    knockbackDir: null,
    knockbackImmuneTimeLeft: 0,
    rootTimeLeft: 0, // 土の「最初の敵を捕らえる」で完全停止/大幅減速している間のタイマー
    burnTimeLeft: 0,
    burnDps: 0,
    poisonTimeLeft: 0,
    poisonAge: 0,
    poisonDps: 0,
    curseTimeLeft: 0,
    curseBonus: 0,
    wardLeft: def.ward ? 1 : 0, // 加護。祓の札で剥がすまでダメージを大きく軽減する
    wardBrokenLeft: 0,
    lastDir: { dx: 1, dy: 0 },
    avoidWallId: null,
    avoidDir: null,
    hitFlash: 0, // 被弾した瞬間だけ光らせる演出用タイマー
    wobbleSeed: Math.random() * Math.PI * 2, // 個体ごとに紙が揺れる位相をずらす
    // ボス登場演出: この間は動かず、拡大縮小フェードインしながら画面が少し暗転する
    entranceTimeLeft: def.isBoss ? BOSS_ENTRANCE_SECONDS : 0,
  })
}

function getWallSpan(wall) {
  return { top: wall.y - WALL_SPAN_PX / 2, bottom: wall.y + WALL_SPAN_PX / 2 }
}

// 自分より少し前方(WALL_DETECT_AHEAD以内)にあり、今の高さを塞いでいる壁を探す。
// 遠くの壁は見えない=まだ気づかない、という局所的な索敵。
function findBlockingWallAhead(towers, e) {
  let best = null
  let bestDist = Infinity
  for (const w of towers) {
    if (OFUDA_TYPES[w.type].kind !== 'wall') continue
    const dx = w.x - e.x
    if (dx < -20 || dx > WALL_DETECT_AHEAD) continue
    const { top, bottom } = getWallSpan(w)
    if (e.y < top || e.y > bottom) continue
    if (dx < bestDist) {
      bestDist = dx
      best = w
    }
  }
  return best
}

function computeSupportMultipliers(towers, effects) {
  const supports = towers.filter((t) => OFUDA_TYPES[t.type].kind === 'support')
  // スキルツリー「支援効果」の段階に応じて、支援札自体のバフ量を底上げする
  const tierBonus = effects.supportTier ?? 0
  const result = new Map()
  for (const t of towers) {
    const def = OFUDA_TYPES[t.type]
    if (def.kind !== 'attack') continue
    let dmgMult = 1
    let intervalMult = 1
    for (const s of supports) {
      const sdef = OFUDA_TYPES[s.type]
      if (Math.hypot(s.x - t.x, s.y - t.y) <= sdef.range) {
        dmgMult *= sdef.buff.damageMult + tierBonus * 0.06
        intervalMult *= Math.max(sdef.buff.intervalMult - tierBonus * 0.03, 0.5)
      }
    }
    result.set(t.id, { dmgMult, intervalMult })
  }
  return result
}

// 敵1体に対するダメージ倍率(耐性/弱点 × 加護 × 呪い)。加護を剥がす副作用もここで処理する。
function hitMultiplier(target, kindId, def, effects) {
  const tdef = ENEMY_TYPES[target.type]
  let mult = affinityMult(tdef, kindId, effects)
  const warded = target.wardLeft > 0 && target.wardBrokenLeft <= 0
  if (warded) mult *= kindId === 'harai' ? 2 : 0.4
  if (kindId === 'harai' && target.wardLeft > 0) {
    target.wardBrokenLeft = (def.wardBreakSeconds ?? 5) * (effects?.wardBreakMult ?? 1)
  }
  if (target.curseTimeLeft > 0) mult *= 1 + target.curseBonus
  return mult
}

function nearestEnemyExcluding(state, from, excluded, maxDist) {
  let best = null
  let bestDist = maxDist
  for (const e of state.enemies) {
    if (excluded.includes(e) || e.hp <= 0 || e.entranceTimeLeft > 0) continue
    const d = Math.hypot(e.x - from.x, e.y - from.y)
    if (d <= bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

function applyImpact(state, kindId, def, target, effects) {
  // 「被弾しても白く光ってるのが分かりにくい」との指摘を受けて、長さ・最大輝度とも底上げする
  // (以前の0.12秒だと、早送り速度が上がるほど1フレームも描かれず終わることがあった)
  target.hitFlash = 0.22
  // ボス級への攻撃だけ、当たった瞬間にごく短いヒットストップを入れて手応えを出す
  // (雑魚敵にまでかけると早送り時に頻発しすぎて逆にカクついて見えるため、ボス級限定にする)
  const targetDef = ENEMY_TYPES[target.type]
  if (targetDef.isBoss || targetDef.isMidBoss) {
    state.hitStop = Math.max(state.hitStop, 0.045)
  }
  // 基本札「状態異常の敵に追加ダメージ」: 発射時点ではなく着弾時点の相手の状態で判定する
  const isAfflicted = target.burnTimeLeft > 0 || target.slowTimeLeft > 0 || target.knockbackTimeLeft > 0
  let damage = def.checkStatusBonus && isAfflicted ? def.damage * STATUS_BONUS_MULT : def.damage
  const aff = affinityMult(targetDef, kindId, effects)
  // 加護: 守りが生きている間は祓以外のダメージを大きく軽減。祓は倍のダメージで守りを剥がす。
  // 呪い: 呪われている間は受けるダメージが増える。
  damage *= hitMultiplier(target, kindId, def, effects)

  switch (kindId) {
    case 'fire': {
      target.hp -= damage
      if (def.hasSplash) {
        // 強化済み: 着弾点の周囲にいる敵全員(自分自身を含む)に炎上を広げる
        for (const e of state.enemies) {
          if (Math.hypot(e.x - target.x, e.y - target.y) <= def.aoeRadius) {
            e.burnDps = def.dot.damagePerSec * affinityMult(ENEMY_TYPES[e.type], 'fire', effects)
            e.burnTimeLeft = def.dot.duration
            e.hitFlash = Math.max(e.hitFlash, 0.18)
          }
        }
      } else {
        // 未強化: 直撃した相手だけが燃える(周囲への延焼はしない)
        target.burnDps = def.dot.damagePerSec * aff
        target.burnTimeLeft = def.dot.duration
      }
      break
    }
    case 'wind': {
      target.hp -= damage
      // 既にノックバック中、または直後のクールダウン中の相手に重ねがけすると
      // (特に風の札を複数配置した時に)別々のタワーがバトンタッチしながら
      // 永久に近い足止めをしてしまうため、免疫時間が切れるまで再付与しない。
      if (!targetDef.knockbackImmune && target.knockbackTimeLeft <= 0 && target.knockbackImmuneTimeLeft <= 0) {
        const dir = target.lastDir || { dx: -1, dy: 0 }
        target.knockbackTimeLeft = def.knockbackSeconds * (effects?.knockbackMult ?? 1)
        target.knockbackDir = { dx: -dir.dx, dy: -dir.dy }
      }
      break
    }
    case 'ice': {
      target.hp -= damage
      if (!targetDef.slowImmune) {
        target.slowTimeLeft = def.slow.duration
        target.slowRatio = Math.min(0.85, def.slow.ratio + (effects?.iceSlowRatioAdd ?? 0))
      }
      break
    }
    case 'sniper': {
      // 破魔矢: ボス・中ボスへの特攻(スキルで解放)
      const big = targetDef.isBoss || targetDef.isMidBoss
      target.hp -= big ? damage * (effects?.sniperBossMult ?? 1) : damage
      break
    }
    case 'cannon': {
      // 着弾点を中心に範囲攻撃。中心が100%、爆発の端で60%。敵が固まっているほど強い。
      const radius = def.aoeRadius * (effects?.cannonRadiusMult ?? 1)
      state.fx.push({ type: 'explosion', x: target.x, y: target.y, radius, timeLeft: 0.35, maxTime: 0.35 })
      state.screenShake = { magnitude: Math.max(state.screenShake?.magnitude ?? 0, 3), timeLeft: 0.12 }
      for (const e of state.enemies) {
        const d = Math.hypot(e.x - target.x, e.y - target.y)
        if (d > radius) continue
        const falloff = 1 - 0.4 * (d / radius)
        e.hp -= def.damage * (def.checkStatusBonus && isAfflicted ? STATUS_BONUS_MULT : 1) * falloff * hitMultiplier(e, kindId, def, effects)
        e.hitFlash = Math.max(e.hitFlash, 0.2)
        // 爆風の押し戻し(スキルで解放)。ボスや重い敵は動かない
        if (effects?.cannonKnockback) {
          const edef = ENEMY_TYPES[e.type]
          if (!edef.isBoss && !edef.knockbackImmune) {
            const nx = d > 0 ? (e.x - target.x) / d : -1
            const ny = d > 0 ? (e.y - target.y) / d : 0
            e.x = Math.max(FIELD.toriiX, e.x + nx * 28)
            e.y = Math.max(0, Math.min(FIELD.height, e.y + ny * 28))
          }
        }
      }
      break
    }
    case 'poison': {
      target.hp -= damage
      const scale = def.damage / (OFUDA_TYPES.poison.damage || 1)
      target.poisonDps = Math.max(target.poisonDps, def.poisonDps * scale)
      target.poisonTimeLeft = def.poisonDuration
      break
    }
    case 'thunder': {
      target.hp -= damage
      // 雷の連鎖: 近くの敵へ最大N回、少しずつ威力を落としながら飛び移る
      const visited = [target]
      let current = target
      let chainDamage = def.damage
      const chains = effects?.thunderChain ?? 3
      for (let i = 0; i < chains; i++) {
        const next = nearestEnemyExcluding(state, current, visited, def.chainRange)
        if (!next) break
        chainDamage *= def.chainDecay
        next.hp -= chainDamage * hitMultiplier(next, kindId, def, effects)
        next.hitFlash = Math.max(next.hitFlash, 0.2)
        state.fx.push({ type: 'lightning', x1: current.x, y1: current.y, x2: next.x, y2: next.y, timeLeft: 0.25, maxTime: 0.25 })
        visited.push(next)
        current = next
      }
      break
    }
    case 'curse': {
      target.hp -= damage
      target.curseTimeLeft = def.curseDuration * (effects?.curseLong ? 1.8 : 1)
      target.curseBonus = Math.max(target.curseBonus, effects?.curseBonus ?? 0.25)
      break
    }
    default: {
      target.hp -= damage
    }
  }
}

const MINION_SPEED = 120
const MINION_LEASH = 230 // 札からこれ以上離れた敵は追わない
const MINION_CONTACT_DAMAGE = 9 // 式神が敵に触れている間に受けるダメージ/秒

function updateMinions(state, dt, effects) {
  const owners = new Map(state.towers.map((t) => [t.id, t]))
  const sdef = OFUDA_TYPES.shiki
  const alive = []
  for (const m of state.minions) {
    const owner = owners.get(m.ownerId)
    m.life -= dt
    if (!owner || m.life <= 0 || m.hp <= 0) continue
    let target = null
    let best = Infinity
    for (const e of state.enemies) {
      if (e.entranceTimeLeft > 0 || e.hp <= 0) continue
      if (Math.hypot(e.x - owner.x, e.y - owner.y) > MINION_LEASH) continue
      const d = Math.hypot(e.x - m.x, e.y - m.y)
      if (d < best) {
        best = d
        target = e
      }
    }
    const tx = target ? target.x : owner.x + m.homeDx
    const ty = target ? target.y : owner.y + m.homeDy
    const dx = tx - m.x
    const dy = ty - m.y
    const dist = Math.hypot(dx, dy)
    const reach = target ? ENEMY_TYPES[target.type].radius + 8 : 6
    if (dist > reach) {
      m.x += (dx / dist) * MINION_SPEED * dt
      m.y += (dy / dist) * MINION_SPEED * dt
    }
    m.facing = dx >= 0 ? 1 : -1
    if (target && dist <= reach + 6) {
      target.hp -= m.dps * dt * hitMultiplier(target, 'shiki', sdef, effects)
      m.hp -= MINION_CONTACT_DAMAGE * dt
      m.attacking = true
    } else {
      m.attacking = false
    }
    alive.push(m)
  }
  state.minions = alive
}

function tickSpecialTowers(state, t, def, dt, effects) {
  // 小判・式神: 波の最中だけ動く(配置フェーズの間は何も起きない)
  if (!state.waveActive) return
  t.cooldown -= dt
  if (t.cooldown > 0) return
  if (def.kind === 'economy') {
    t.cooldown = def.interval * Math.max(0.3, effects.kobanIntervalMult ?? 1)
    const amount = Math.max(1, Math.round(def.amount * (effects.kobanMult ?? 1) * effects.currencyMult))
    state.currencyThisRun += amount
    t.fireFlash = 0.15
    state.fx.push({ type: 'sparkle', x: t.x, y: t.y, timeLeft: 0.6, maxTime: 0.6 })
    state.fx.push({ type: 'currency-popup', text: `+${amount}`, x: t.x, y: t.y - 30, timeLeft: 0.7, maxTime: 0.7 })
    return
  }
  // 式神
  const max = effects.shikiMax ?? 2
  const mine = state.minions.filter((m) => m.ownerId === t.id).length
  if (mine >= max) {
    t.cooldown = 0.5
    return
  }
  t.cooldown = def.interval
  t.fireFlash = 0.15
  const dps = def.damage * effects.globalDamageMult * (effects.perOfudaMult?.shiki ?? 1)
  const hp = def.minionHp * (effects.towerHpMult ?? 1) * (effects.perOfudaMult?.shiki ?? 1)
  state.minions.push({
    id: nextId(),
    ownerId: t.id,
    x: t.x,
    y: t.y,
    hp,
    maxHp: hp,
    dps,
    life: def.minionLife,
    homeDx: (Math.random() - 0.5) * 60,
    homeDy: (Math.random() - 0.5) * 60,
    facing: 1,
    attacking: false,
  })
}

function runBossPhase(state, boss, dt, effects) {
  const bs = state.bossState
  bs.phaseTimer += dt
  if (bs.phaseTimer < BOSS_PHASE_INTERVAL) return
  bs.phaseTimer = 0
  if (bs.phaseIndex % 2 === 0) {
    // お札破壊の範囲攻撃
    state.fx.push({ type: 'boss-aoe', x: boss.x, y: boss.y, timeLeft: 0.5, maxTime: 0.5, radius: BOSS_AOE_RADIUS })
    state.screenShake = { magnitude: 10, timeLeft: 0.35 }
    for (const t of state.towers) {
      if (Math.hypot(t.x - boss.x, t.y - boss.y) <= BOSS_AOE_RADIUS) {
        t.hp -= BOSS_AOE_DAMAGE * (effects?.towerDamageTakenMult ?? 1)
      }
    }
  } else {
    // 雑魚の大量召喚
    state.fx.push({ type: 'boss-summon', x: boss.x, y: boss.y, timeLeft: 0.5, maxTime: 0.5, radius: 60 })
    for (let i = 0; i < BOSS_SUMMON_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / BOSS_SUMMON_COUNT
      spawnEnemy(state, ENEMY_TYPES[boss.type].summonType ?? 'onibi', boss.x + Math.cos(angle) * 50, boss.y + Math.sin(angle) * 50)
    }
  }
  bs.phaseIndex += 1
}

export function step(state, dt, skillEffects) {
  if (state.outcome) return
  // ヒットストップ中は描画はそのまま続くが、シミュレーションだけ一瞬止めて「効いた」重みを出す
  if (state.hitStop > 0) {
    state.hitStop -= dt
    return
  }
  const effects = skillEffects ?? { globalDamageMult: 1, perOfudaMult: {}, currencyMult: 1 }

  // 湧き出し
  if (state.waveActive) {
    state.waveClock += dt
    while (state.spawnQueue.length && state.spawnQueue[0].t <= state.waveClock) {
      const s = state.spawnQueue.shift()
      spawnEnemy(state, s.type, undefined, undefined, s.hpMult ?? 1)
      if (typeof s.batch === 'number') state.currentBatch = s.batch
    }
  }

  // 敵の行動
  for (const e of state.enemies) {
    const def = ENEMY_TYPES[e.type]

    if (e.entranceTimeLeft > 0) {
      // ボス登場演出中は動かず、攻撃もしない(見た目の拡大縮小フェードインはGameCanvas側で担当)
      e.entranceTimeLeft -= dt
      continue
    }

    if (e.hitFlash > 0) e.hitFlash -= dt
    if (e.wardBrokenLeft > 0) e.wardBrokenLeft -= dt

    if (e.curseTimeLeft > 0) e.curseTimeLeft -= dt
    const curseMul = e.curseTimeLeft > 0 ? 1 + e.curseBonus : 1
    if (e.poisonTimeLeft > 0) {
      // 毒: 効いている時間が長いほど最大5倍まで強くなる
      e.poisonAge += dt
      e.hp -= e.poisonDps * (1 + Math.min(e.poisonAge * 0.5, 4)) * dt * curseMul
      e.poisonTimeLeft -= dt
      if (e.poisonTimeLeft <= 0) e.poisonAge = 0
    }
    if (e.burnTimeLeft > 0) {
      e.hp -= e.burnDps * dt * curseMul
      e.burnTimeLeft -= dt
      e.hitFlash = Math.max(e.hitFlash, 0.1) // 継続ダメージも軽く光らせる
    }

    if (e.knockbackImmuneTimeLeft > 0) {
      e.knockbackImmuneTimeLeft -= dt
    }

    if (e.rootTimeLeft > 0) {
      // 土の「最初の敵を捕らえる」で完全停止/大幅減速中。何もせず時間経過だけ進める
      e.rootTimeLeft -= dt
    } else if (e.knockbackTimeLeft > 0) {
      const speed = BASE_SPEED * def.speedMult
      e.x += e.knockbackDir.dx * speed * dt
      e.y += e.knockbackDir.dy * speed * dt
      e.knockbackTimeLeft -= dt
      if (e.knockbackTimeLeft <= 0) {
        e.knockbackImmuneTimeLeft = KNOCKBACK_IMMUNITY_SECONDS
      }
    } else {
      let speedMult = def.speedMult
      if (e.slowTimeLeft > 0) {
        speedMult *= 1 - e.slowRatio
        e.slowTimeLeft -= dt
      }
      const speed = BASE_SPEED * speedMult

      if (e.avoidWallId != null) {
        const wall = state.towers.find((t) => t.id === e.avoidWallId)
        if (!wall) {
          e.avoidWallId = null
          e.avoidDir = null
        } else {
          const { top, bottom } = getWallSpan(wall)
          const cleared = e.avoidDir < 0 ? e.y < top : e.y > bottom
          if (cleared) {
            e.avoidWallId = null
            e.avoidDir = null
            e.x += speed * dt
            e.lastDir = { dx: 1, dy: 0 }
          } else {
            const atFieldEdge = e.avoidDir < 0 ? e.y <= 0 : e.y >= FIELD.height
            if (atFieldEdge) {
              // 上にも下にも逃げ場がない=完全に塞がれている。壁を殴って突破を試みる
              wall.hp -= BASE_WALL_ATTACK_DPS * WALL_ATTACK_MULT * dt
            } else {
              e.y += e.avoidDir * speed * dt
              e.y = Math.max(0, Math.min(FIELD.height, e.y))
              e.lastDir = { dx: 0, dy: e.avoidDir }
            }
          }
        }
      } else {
        const blocker = findBlockingWallAhead(state.towers, e)
        if (blocker) {
          const { top, bottom } = getWallSpan(blocker)
          e.avoidWallId = blocker.id
          e.avoidDir = Math.abs(e.y - top) <= Math.abs(e.y - bottom) ? -1 : 1
          // 土の「最初の敵を捕らえる」: 壁に初めて接触した瞬間だけ発動する罠(残り回数制、
          // 宝珠「双牢」で1ターンあたりの回数が増える)
          if (effects.earthCatch && blocker.catchCharges > 0) {
            blocker.catchCharges -= 1
            if (def.isBoss) {
              e.slowTimeLeft = EARTH_CATCH_BOSS_SLOW_SECONDS
              e.slowRatio = EARTH_CATCH_BOSS_SLOW_RATIO
            } else {
              e.rootTimeLeft = EARTH_CATCH_ROOT_SECONDS
            }
          }
        } else {
          e.x += speed * dt
          e.lastDir = { dx: 1, dy: 0 }
        }
      }
    }

    if (def.cardSlash) {
      for (const t of state.towers) {
        if (Math.hypot(t.x - e.x, t.y - e.y) <= CARD_SLASH_RADIUS) {
          t.hp -= CARD_SLASH_DPS * dt * (effects.towerDamageTakenMult ?? 1)
        }
      }
    }

    if (def.isBoss) {
      runBossPhase(state, e, dt, effects)
    }
  }

  // 壁待ちなどで敵同士が密集しすぎると、重なって数が見えづらくなる上に
  // 範囲攻撃がまとめて効いてしまい難易度も下がるため、近すぎる敵同士を軽く引き離す
  for (let i = 0; i < state.enemies.length; i++) {
    for (let j = i + 1; j < state.enemies.length; j++) {
      const a = state.enemies[i]
      const b = state.enemies[j]
      const minDist = ENEMY_TYPES[a.type].radius + ENEMY_TYPES[b.type].radius + 6
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist >= minDist) continue
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : 1
      const push = ((minDist - dist) / minDist) * SEPARATION_PUSH * dt
      a.x = Math.max(0, Math.min(FIELD.width, a.x - nx * push * 0.5))
      a.y = Math.max(0, Math.min(FIELD.height, a.y - ny * push * 0.5))
      b.x = Math.max(0, Math.min(FIELD.width, b.x + nx * push * 0.5))
      b.y = Math.max(0, Math.min(FIELD.height, b.y + ny * push * 0.5))
    }
  }

  // 本殿到達判定(防衛失敗)。ゴールは点ではなく本殿のx座標のライン全体なので、
  // yに関わらずそのxまで到達したら防衛失敗とする(経路探索のゴール定義と一致させる)。
  for (const e of state.enemies) {
    if (e.x >= FIELD.hondenX - HONDEN_RADIUS) {
      if (effects.secondChance && !state.secondChanceUsed) {
        // スキル「不退転」: 本殿に届いた敵をまとめて押し返し、その場は持ちこたえる
        state.secondChanceUsed = true
        for (const o of state.enemies) {
          if (o.x >= FIELD.hondenX - HONDEN_RADIUS - 120) o.x = FIELD.hondenX - 320
        }
        state.fx.push({ type: 'currency-popup', text: '不退転!', x: FIELD.hondenX - 80, y: FIELD.hondenY - 60, timeLeft: 1.4, maxTime: 1.4 })
        state.screenShake = { magnitude: 12, timeLeft: 0.4 }
        break
      }
      state.outcome = 'defeated'
      return
    }
  }

  // お札の攻撃
  for (const t of state.towers) {
    if (t.fireFlash > 0) t.fireFlash -= dt
    if (t.placedFlash > 0) t.placedFlash = Math.max(t.placedFlash - dt, 0)
  }
  const supportMult = computeSupportMultipliers(state.towers, effects)

  // 支援札「周囲の札を回復する球」: 一定間隔で周囲のお札を少し回復する
  if (effects.supportHeal) {
    for (const s of state.towers) {
      const sdef = OFUDA_TYPES[s.type]
      if (sdef.kind !== 'support') continue
      s.healCooldown -= dt
      if (s.healCooldown > 0) continue
      // 宝珠「常温」: 回復間隔を大幅に短縮する
      s.healCooldown = SUPPORT_HEAL_INTERVAL * (effects.supportHealIntervalMult ?? 1)
      for (const t of state.towers) {
        if (t.hp < t.maxHp && Math.hypot(t.x - s.x, t.y - s.y) <= sdef.range) {
          t.hp = Math.min(t.maxHp, t.hp + SUPPORT_HEAL_AMOUNT)
        }
      }
    }
  }
  for (const t of state.towers) {
    const def = OFUDA_TYPES[t.type]
    if (def.kind === 'economy' || def.kind === 'summon') {
      tickSpecialTowers(state, t, def, dt, effects)
      continue
    }
    if (def.kind !== 'attack') continue
    t.cooldown -= dt
    if (t.cooldown > 0) continue

    // 宝珠「疾風」: 全ての攻撃札の射程を伸ばす
    const effectiveRange = def.range * (effects.rangeMult ?? 1) * (t.type === 'sniper' ? effects.sniperRangeMult ?? 1 : 1)

    // ロックオン: 既存ターゲットが生存・射程内ならそれを狙い続ける。
    // 敵が波でまとまって出現すると「本殿への残距離」がほぼ同点になり、狙いが
    // 毎フレーム入れ替わって誰も倒しきれない、という事故を防ぐため。
    let target = null
    if (t.targetId != null) {
      const current = state.enemies.find((e) => e.id === t.targetId)
      if (current && Math.hypot(current.x - t.x, current.y - t.y) <= effectiveRange) {
        target = current
      }
    }

    if (!target) {
      let bestScore = Infinity
      for (const e of state.enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y)
        if (d > effectiveRange) continue
        // 新規ターゲット選定: まず「あと何発で倒せるか」が少ない敵を最優先する。
        // 本殿への残距離だけで選ぶと、鎌鼬のような硬くて速い敵に張り付いたまま
        // 倒しきれず射程外へ逃げられ、その間に雑魚が無傷で素通りしてしまうため。
        // 倒しやすさが同程度の場合のみ、本殿への残距離が短い敵を優先する。
        const shotsNeeded = Math.ceil(e.hp / def.damage)
        const distToGoal = Math.hypot(e.x - FIELD.hondenX, e.y - FIELD.hondenY)
        // ノックバック中の敵は動けるようになるまで後回し(でないと永久ハメになりうる)
        const knockbackPenalty = e.knockbackTimeLeft > 0 ? 1e8 : 0
        const score = shotsNeeded * 100000 + distToGoal + knockbackPenalty
        if (score < bestScore) {
          bestScore = score
          target = e
        }
      }
    }
    t.targetId = target ? target.id : null
    if (target) {
      t.fireFlash = 0.15
      const mult = supportMult.get(t.id) ?? { dmgMult: 1, intervalMult: 1 }
      const baseDamage = def.damage * effects.globalDamageMult * (effects.perOfudaMult?.[t.type] ?? 1) * mult.dmgMult
      const isBasic = t.type === 'basic'
      // 破魔矢の会心の一撃
      const isCrit = t.type === 'sniper' && Math.random() < (effects.sniperCritChance ?? 0)
      if (isCrit) state.fx.push({ type: 'currency-popup', text: '会心!', x: t.x, y: t.y - 34, timeLeft: 0.7, maxTime: 0.7 })
      state.projectiles.push({
        id: nextId(),
        kind: t.type,
        x: t.x,
        y: t.y,
        targetId: target.id,
        damage: isCrit ? baseDamage * 2.5 : baseDamage,
        hasSplash: t.type === 'fire' ? effects.fireHasSplash : undefined,
        checkStatusBonus: isBasic && effects.basicVsStatusBonus,
      })
      // 基本札「時々追加の球」: 通常弾のすぐ後にもう1発、半分威力の球を追加で放つ
      if (isBasic && effects.basicDoubleShot && Math.random() < DOUBLE_SHOT_CHANCE) {
        state.projectiles.push({
          id: nextId(),
          kind: t.type,
          x: t.x,
          y: t.y,
          targetId: target.id,
          damage: baseDamage * DOUBLE_SHOT_DAMAGE_MULT,
          checkStatusBonus: effects.basicVsStatusBonus,
        })
      }
      // 基本札「連射速度アップ」+ 宝珠「俊敏」(全攻撃札共通)
      const fireRateMult = isBasic && effects.basicFireRateBonus ? 0.75 : 1
      t.cooldown = def.interval * mult.intervalMult * fireRateMult * (effects.intervalMult ?? 1)
    }
  }

  updateMinions(state, dt, effects)

  // 除霊の球の移動・命中判定
  const survivingProjectiles = []
  for (const p of state.projectiles) {
    const target = state.enemies.find((e) => e.id === p.targetId)
    if (!target) continue
    const dx = target.x - p.x
    const dy = target.y - p.y
    const dist = Math.hypot(dx, dy)
    const moveStep = PROJECTILE_SPEED * dt
    if (dist <= moveStep) {
      const def = OFUDA_TYPES[p.kind]
      applyImpact(state, p.kind, { ...def, damage: p.damage, hasSplash: p.hasSplash, checkStatusBonus: p.checkStatusBonus }, target, effects)
      continue
    }
    p.x += (dx / dist) * moveStep
    p.y += (dy / dist) * moveStep
    p.angle = Math.atan2(dy, dx) // 破魔矢など、向きを持つ弾の描画用
    survivingProjectiles.push(p)
  }
  state.projectiles = survivingProjectiles

  // 撃破処理・通貨ドロップ
  const survivors = []
  for (const e of state.enemies) {
    if (e.hp > 0) {
      survivors.push(e)
      continue
    }
    state.kills += 1
    const def = ENEMY_TYPES[e.type]
    // 毒の感染(スキル/宝珠で解放): 毒に侵されたまま倒れた敵の周囲へ毒が広がる
    if (effects.poisonSpread && e.poisonTimeLeft > 0) {
      for (const o of state.enemies) {
        if (o === e || o.hp <= 0) continue
        if (Math.hypot(o.x - e.x, o.y - e.y) <= 100) {
          o.poisonTimeLeft = OFUDA_TYPES.poison.poisonDuration
          o.poisonDps = Math.max(o.poisonDps, e.poisonDps)
          o.poisonAge = Math.max(o.poisonAge, e.poisonAge * 0.5)
        }
      }
    }
    // 中ボス・ボスは「気づいたら倒してた」となりがちなので、専用のカットインとヒットストップで
    // 撃破の瞬間をはっきり見せる
    if (def.isBoss || def.isMidBoss) {
      state.hitStop = Math.max(state.hitStop, def.isBoss ? 0.3 : 0.2)
      state.fx.push({
        type: 'defeat-cutin',
        name: def.name,
        isBoss: def.isBoss,
        x: e.x,
        y: e.y,
        timeLeft: 1.2,
        maxTime: 1.2,
      })
    }
    // 撃破時に紙片が四方へ飛び散る演出(差分アニメの代わりにコード側のジューシーさで見せる)
    // 円形/長方形の2種類をランダムに使い、敵自身の色でティントする
    const shardCount = 5
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.6
      const speed = 60 + Math.random() * 60
      state.fx.push({
        type: 'paper-shard',
        variant: pickRandom(ASSET_PATHS.paperShards),
        color: def.color,
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        timeLeft: 0.5,
        maxTime: 0.5,
      })
    }
    // 宝珠「開幕」: 開幕ボーナスと引き換えに、道中のドロップ率が下がる
    if (Math.random() < def.dropChance * (effects.dropChanceMult ?? 1)) {
      // 支援札「撃破時ボーナス通貨」: 支援札の射程内で倒した場合、獲得通貨を割り増しする
      const nearSupportGold =
        effects.supportGoldBonus &&
        state.towers.some((t) => OFUDA_TYPES[t.type].kind === 'support' && Math.hypot(t.x - e.x, t.y - e.y) <= OFUDA_TYPES[t.type].range)
      const goldMult = nearSupportGold ? SUPPORT_GOLD_BONUS_MULT : 1
      // スキル「福引」: 低確率で通貨が5倍になる大当たり
      const jackpot = effects.luckyDrop && Math.random() < 0.06
      // 少額でも切り捨て/切り上げで偏らないよう、端数は確率で切り上げる
      const raw = (def.dropMin + Math.random() * (def.dropMax - def.dropMin)) * CURRENCY_DROP_SCALE * effects.currencyMult * goldMult * (jackpot ? 5 : 1)
      const amount = Math.max(1, Math.floor(raw + Math.random()))
      state.currencyThisRun += amount
      // 通貨獲得を「+N」のポップアップ数字で見せる
      state.fx.push({
        type: 'currency-popup',
        text: jackpot ? `大当たり! +${amount}` : `+${amount}`,
        x: e.x,
        y: e.y,
        timeLeft: 0.7,
        maxTime: 0.7,
      })
    }
  }
  state.enemies = survivors

  // 破壊されたお札の除去(斬られて真っ二つになる演出を残してから消す)
  const survivingTowers = []
  for (const t of state.towers) {
    if (t.hp > 0) {
      survivingTowers.push(t)
      continue
    }
    state.fx.push({
      type: 'card-break',
      ofudaType: t.type,
      x: t.x,
      y: t.y,
      timeLeft: 0.5,
      maxTime: 0.5,
    })
  }
  state.towers = survivingTowers

  // 演出タイマー
  if (state.screenShake.timeLeft > 0) {
    state.screenShake.timeLeft -= dt
  }

  state.fx = state.fx.filter((f) => {
    f.timeLeft -= dt
    if (f.type === 'paper-shard') {
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vy += 220 * dt // 紙片が重力でふわっと落ちる
      f.rotation += f.rotSpeed * dt
    }
    if (f.type === 'currency-popup') {
      f.y -= 40 * dt // 上へふわっと浮かびながら消える
    }
    return f.timeLeft > 0
  })

  // ウェーブクリア判定
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false
    state.waveCleared = true
    if (state.isBossWave && state.isMilestoneWave) {
      // 章の途中の節目ボス: 章は続く(宝珠と御霊だけもらえる)
      state.milestoneCleared = true
    } else if (state.isBossWave) {
      if ((state.chapter ?? 1) >= MAX_CHAPTER) state.outcome = 'cleared'
      else state.chapterCleared = true
    }

    // クリアを祝う紙吹雪を画面上部から降らせる(paper-shardと同じ物理・描画を流用)
    const confettiColors = Object.values(OFUDA_TYPES).map((d) => d.accent)
    for (let i = 0; i < 24; i++) {
      state.fx.push({
        type: 'paper-shard',
        variant: pickRandom(ASSET_PATHS.paperShards),
        color: pickRandom(confettiColors),
        x: Math.random() * FIELD.width,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        timeLeft: 1.8 + Math.random() * 0.6,
        maxTime: 2.4,
      })
    }
  }
}
