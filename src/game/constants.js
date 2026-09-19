// 企画書「5. お札」「6. 敵」の数値をそのままゲーム内単位に変換する。
// 1マス(仮想単位) = 60px として換算。数値は全て仮(企画書内の注記通り、プレイテストで調整前提)。
export const UNIT = 60

export const FIELD = {
  width: 960,
  height: 540,
  cellSize: 30,
  toriiX: 60,
  toriiY: 270,
  hondenX: 900,
  hondenY: 270,
  // 妖怪は左端のこの範囲からランダムなレーンで出現する(1点湧きだと壁で誘導する意味が
  // なくなるため、複数レーンから来るようにして壁による集約・誘導を機能させる)
  spawnMinY: 50,
  spawnMaxY: 490,
}

export const BASE_SPEED = 75 // px/秒(妖怪の基準速度 = 1.0倍)。集団で来るようにした分、少し遅くして反応時間を確保する

export const OFUDA_TYPES = {
  basic: {
    id: 'basic',
    name: '基本の札',
    kind: 'attack',
    damage: 10,
    range: 3 * UNIT,
    interval: 1.0,
    hp: 45,
    color: '#f5ecd7',
    accent: '#c94c4c',
    label: '札',
    flavor: '一番使い慣れた札だよ。特別な効果はないけど、安定した連射でコツコツ攻められるんだ。',
  },
  fire: {
    id: 'fire',
    name: '火の札',
    kind: 'attack',
    // 周囲への延焼(AOE)はスキルツリーの強化ノードで後から解放する仕様にしたため、
    // 素の状態でも単体火力として成立するよう直撃ダメージを引き上げている(6→10)
    damage: 10,
    dot: { damagePerSec: 5, duration: 4 },
    aoeRadius: 2.5 * UNIT,
    range: 2.5 * UNIT,
    interval: 1.3,
    hp: 45,
    color: '#f5e2c8',
    accent: '#d9612b',
    label: '火',
    flavor: '直撃した相手を燃やし続けるよ。スキルツリーで強化すると、周りの敵にも燃え広がるんだ。',
  },
  earth: {
    id: 'earth',
    name: '土の札',
    kind: 'wall',
    hp: 50,
    color: '#e4d3a8',
    accent: '#7a5a34',
    label: '土',
    flavor: '攻撃はできないけど、敵の足止めをしてくれる頼れる壁だよ。強化すると最初に触れた敵を捕まえられるんだ。',
  },
  wind: {
    id: 'wind',
    name: '風の札',
    kind: 'attack',
    damage: 2,
    knockbackSeconds: 2.5,
    range: 3 * UNIT,
    interval: 2.0,
    hp: 45,
    color: '#e6f0f5',
    accent: '#4c9bd9',
    label: '風',
    flavor: '当たった敵を吹き飛ばして時間を稼ぐよ。速い敵への対策にぴったりなんだ。',
  },
  ice: {
    id: 'ice',
    name: '氷の札',
    kind: 'attack',
    damage: 3,
    slow: { ratio: 0.4, duration: 3 },
    range: 2.5 * UNIT,
    interval: 1.2,
    hp: 45,
    color: '#e4f5f5',
    accent: '#3fb0c2',
    label: '氷',
    flavor: '命中した敵の動きを鈍らせるよ。他の札と組み合わせるとより効果的なんだ。',
  },
  harai: {
    id: 'harai',
    name: '祓の札',
    kind: 'attack',
    damage: 12,
    // 加護(ward)を持つ敵の守りを剥がす専用札。加護持ちには大ダメージ、それ以外には控えめ。
    wardBreakSeconds: 5,
    range: 2.5 * UNIT,
    interval: 1.2,
    hp: 45,
    color: '#f2f0f7',
    accent: '#8a6fc4',
    label: '祓',
    flavor: '敵のシールド(加護)を打ち払うよ。シールドには他の札の3倍の勢いで効くから、守りを固めた敵にぴったりなんだ。',
  },
  cannon: {
    id: 'cannon',
    name: '大筒の札',
    kind: 'attack',
    damage: 16,
    aoeRadius: 1.6 * UNIT, // 着弾点を中心に範囲攻撃(中心ほど強く、端は6割)
    range: 3.2 * UNIT,
    interval: 2.6,
    hp: 45,
    color: '#f0dcc0',
    accent: '#b5562b',
    label: '砲',
    flavor: '着弾点をまとめて吹き飛ばす大筒だよ。敵が固まっているほど強いんだ。',
  },
  sniper: {
    id: 'sniper',
    name: '破魔矢の札',
    kind: 'attack',
    damage: 48,
    range: 7 * UNIT,
    interval: 3.6,
    hp: 45,
    color: '#f2ead0',
    accent: '#a83a3a',
    label: '矢',
    flavor: '超長射程の一撃。撃つのはゆっくりだけど、硬い敵やボスにも痛い一発を届けるよ。',
  },
  poison: {
    id: 'poison',
    name: '毒の札',
    kind: 'attack',
    damage: 3,
    poisonDps: 4, // 毒の基本ダメージ/秒。かかり続けるほど最大5倍まで強くなる
    poisonDuration: 5,
    range: 2.5 * UNIT,
    interval: 1.1,
    hp: 45,
    color: '#e3efd3',
    accent: '#6e9b3a',
    label: '毒',
    flavor: '毒を染み込ませるよ。長く効くほど毒が強まるから、足止めと組み合わせると恐ろしいんだ。',
  },
  thunder: {
    id: 'thunder',
    name: '雷の札',
    kind: 'attack',
    damage: 9,
    chainRange: 1.8 * UNIT,
    chainDecay: 0.85,
    range: 2.6 * UNIT,
    interval: 1.5,
    hp: 45,
    color: '#f5efc2',
    accent: '#d6b326',
    label: '雷',
    flavor: '雷が近くの敵へ次々と飛び移るよ。敵が密集しているほど、たくさん巻き込めるんだ。',
  },
  curse: {
    id: 'curse',
    name: '呪の札',
    kind: 'attack',
    damage: 2,
    curseDuration: 6,
    range: 2.5 * UNIT,
    interval: 1.5,
    hp: 45,
    color: '#e4d6ee',
    accent: '#7a4a9c',
    label: '呪',
    flavor: '敵に呪いをかけるよ。呪われた敵は、どの札からのダメージも多く受けるようになるんだ。',
  },
  koban: {
    id: 'koban',
    name: '小判の札',
    kind: 'economy',
    amount: 2,
    interval: 7,
    hp: 45,
    color: '#f7e9b0',
    accent: '#c99a1e',
    label: '金',
    flavor: '一定時間ごとに小判を生み出してくれるよ。早く置くほど、たくさん稼げるんだ。',
  },
  shiki: {
    id: 'shiki',
    name: '式神の札',
    kind: 'summon',
    damage: 10, // 式神が敵に触れている間の与ダメージ/秒
    interval: 5,
    minionHp: 30,
    minionLife: 14,
    hp: 45,
    color: '#e6e0f2',
    accent: '#5a6bb0',
    label: '式',
    flavor: '小さな式神を呼び出して敵を攻撃させるよ。札自体は動かないけど、式神が前に出て戦ってくれるんだ。',
  },
  support: {
    id: 'support',
    name: '支援の札',
    kind: 'support',
    buff: { damageMult: 1.2, intervalMult: 0.9 },
    range: 2.5 * UNIT,
    hp: 45,
    color: '#f7ecc8',
    accent: '#c9a23a',
    label: '援',
    flavor: '近くの札の力を高めてくれる縁の下の力持ちだよ。他の札と一緒に置いてこそ輝くんだ。',
  },
}

export const ENEMY_TYPES = {
  wisp: {
    id: 'wisp',
    name: '雑霊',
    hp: 8, // 直接攻撃はどれも1発で倒せる程度に弱いが、火のAOE(6)の巻き添えだけでは死なない値
    speedMult: 1.1,
    radius: 8,
    color: '#f5e6a8',
    cardSlash: false,
    isBoss: false,
    noScale: true, // ターンが進んでも硬くならない。常にどんな攻撃でも一撃で倒せる
    dropChance: 0.1,
    dropMin: 1,
    dropMax: 1,
  },
  onibi: {
    id: 'onibi',
    name: '鬼火',
    hp: 30,
    speedMult: 1.0,
    radius: 14,
    color: '#e8823c',
    cardSlash: false,
    isBoss: false,
    dropChance: 0.4,
    dropMin: 1,
    dropMax: 2,
  },
  oonyudo: {
    id: 'oonyudo',
    name: '大入道',
    hp: 200,
    speedMult: 0.5,
    radius: 20,
    color: '#5b4a63',
    cardSlash: false,
    isBoss: false,
    isMidBoss: true, // 初登場時は倍速再生を強制解除して、ちゃんと見せるための目印
    // 中ボス格の敵として、終盤ノードの解放資金源になるようドロップを厚めにしている
    // (終盤ノードのコストを単純に周回グラインドで払わせるより、中ボスを倒せば開けるようにする狙い)
    dropChance: 1,
    dropMin: 12,
    dropMax: 18,
  },
  kamaitachi: {
    id: 'kamaitachi',
    name: '鎌鼬',
    hp: 120,
    speedMult: 1.3, // 速すぎて反応する間もなく本殿に到達する、という報告を受けて調整(1.5→1.3)
    radius: 15,
    color: '#8fae4a',
    cardSlash: true,
    isBoss: false,
    dropChance: 0.8,
    dropMin: 8,
    dropMax: 12,
    flipArt: true, // イラストが左向きに描かれているため、右へ進む向きに合わせて反転させる
  },
  // ---- 第2章(雪山)の敵 ----
  yukionna: {
    id: 'yukionna',
    name: '雪女',
    hp: 90,
    speedMult: 0.9,
    radius: 15,
    color: '#cfe6f5',
    cardSlash: false,
    isBoss: false,
    affinity: { fire: 1.7, ice: 0.3 }, // 火に弱く、氷にほぼ耐性
    slowImmune: true,
    dropChance: 0.7,
    dropMin: 6,
    dropMax: 9,
  },
  iwakuronushi: {
    id: 'iwakuronushi',
    name: '岩黒主',
    hp: 500,
    speedMult: 0.4,
    radius: 24,
    color: '#6b6560',
    cardSlash: false,
    isBoss: false,
    isMidBoss: true,
    affinity: { basic: 0.6, wind: 0.3, fire: 1.3, harai: 1.5 }, // 重くて風が効かない
    knockbackImmune: true,
    dropChance: 1,
    dropMin: 18,
    dropMax: 26,
  },
  koorihime: {
    id: 'koorihime',
    name: '凍姫',
    hp: 3200,
    speedMult: 0.9,
    radius: 34,
    color: '#7fb6d9',
    cardSlash: true,
    isBoss: true,
    affinity: { fire: 1.3, ice: 0 },
    slowImmune: true,
    summonType: 'yukionna',
    dropChance: 1,
    dropMin: 160,
    dropMax: 220,
  },
  // ---- 第3章(黄泉)の敵 ----
  kitsune: {
    id: 'kitsune',
    name: '狐憑き',
    hp: 90,
    speedMult: 1.0,
    radius: 14,
    color: '#b56ad6',
    cardSlash: false,
    isBoss: false,
    ward: true, // 祓の札で守りを剥がすまで、ダメージを大きく軽減する
    dropChance: 0.7,
    dropMin: 9,
    dropMax: 13,
  },
  kasha: {
    id: 'kasha',
    name: '火車',
    hp: 130,
    speedMult: 0.95,
    radius: 16,
    color: '#d94a2b',
    cardSlash: true,
    isBoss: false,
    affinity: { fire: 0.2, ice: 1.6 }, // 燃える車輪。火はほぼ効かず、氷に弱い
    dropChance: 0.8,
    dropMin: 10,
    dropMax: 14,
  },
  nurikabe: {
    id: 'nurikabe',
    name: '塗壁',
    hp: 800,
    speedMult: 0.35,
    radius: 26,
    color: '#4a4560',
    cardSlash: false,
    isBoss: false,
    isMidBoss: true,
    ward: true,
    affinity: { wind: 0.3, harai: 1.5 },
    knockbackImmune: true,
    dropChance: 1,
    dropMin: 24,
    dropMax: 34,
  },
  magatsuhi: {
    id: 'magatsuhi',
    name: '大禍津日',
    hp: 6000,
    speedMult: 0.9,
    radius: 36,
    color: '#2b1638',
    cardSlash: true,
    isBoss: true,
    ward: true,
    affinity: { harai: 1.5 },
    summonType: 'kitsune',
    dropChance: 1,
    dropMin: 220,
    dropMax: 300,
  },
  aramitama: {
    id: 'aramitama',
    name: '荒魂',
    hp: 2200,
    speedMult: 1.0,
    radius: 32,
    color: '#7a1f2b',
    cardSlash: true,
    isBoss: true,
    dropChance: 1,
    dropMin: 100,
    dropMax: 150,
  },
}

export const PROJECTILE_SPEED = 480
// ノックバックが終わった直後、しばらく再ノックバック不可にする猶予時間。
// ノックバック自体の時間(knockbackSeconds=2.5秒)より短いと、後退の方が
// 前進より大きくなって実質的に足止めが続いてしまうため、それより長めに取る。
export const KNOCKBACK_IMMUNITY_SECONDS = 4.5
export const WALL_ATTACK_MULT = 4 // 迂回不可能時、最寄りの壁を攻撃する速度倍率(仮に3〜5倍の中間)
export const BASE_WALL_ATTACK_DPS = 8
export const CARD_SLASH_DPS = 12 // 鎌鼬・荒魂の「札斬り」接触ダメージ/秒
export const CARD_SLASH_RADIUS = 34

// 敵の撃破ドロップ全体にかける倍率(稼ぎ過ぎ対策の調整つまみ)。1で従来通り。
export const CURRENCY_DROP_SCALE = 0.5
export const MAX_TURN = 10
export const MAX_CHAPTER = 3
// ターンが進むほど敵のHPを底上げする係数(仮)。塔の増加ペース(1ターン2枚)だけでは
// 追いつかなくなる負荷を作り、「基本の札だけでずっと押し切れる」を防ぐための成長曲線。
// ボス(荒魂)は既に固有の数値を持つため対象外。
export const ENEMY_HP_SCALE_PER_TURN = 0.13
export const BOSS_PHASE_INTERVAL = 6 // 秒: 荒魂の行動切り替え間隔
export const BOSS_AOE_RADIUS = 220
export const BOSS_AOE_DAMAGE = 14
export const BOSS_SUMMON_COUNT = 5
// ボス登場演出(拡大縮小フェードイン+画面暗転)の長さ。この間ボスは動かず攻撃もしない
export const BOSS_ENTRANCE_SECONDS = 1.4

// 第2章以降は、お札が全部片付いた状態から始まるので、最初の数ターンは多めに札を置ける
// (ターン1: +2枚 / ターン2: +1枚)。候補は置ける枚数より必ず1枚多く配る。
export function chapterStartBonus(chapter, turn) {
  if (chapter < 2) return 0
  return turn === 1 ? 2 : turn === 2 ? 1 : 0
}

export const CANDIDATE_COUNT = 3 // 毎ターンの候補提示枚数(仮)
export const CANDIDATE_PICK_MAX = 2 // 選択可能枚数(仮)
