// public/assets 以下の画像を読み込むための一元管理。
// base(vite.config.jsのbase:'./')に対応するため、必ずBASE_URL経由でパスを組み立てる
// (これをやらないと、Artifactのようにルート以外のパスへ配置した時にリンク切れになる)。
const BASE = import.meta.env?.BASE_URL ?? ''

// 画像は tools/optimize_images.py でWebPに変換して配信する。コード上の名前は .png/.jpg のままにして、
// ここで .webp に読み替える(新しい画像は `npm run optimize` で変換してから使う)。
function p(path) {
  return `${BASE}${path.replace(/\.(png|jpe?g)$/i, '.webp')}`
}

const cache = new Map()

function loadImage(src) {
  if (!src) return null
  if (cache.has(src)) return cache.get(src)
  const img = new Image()
  // loaded: 実際に表示に使ってよいか(getImage用。404の間はfalseのままにして図形フォールバックを継続させる)
  // settled: 読み込み試行が完了したか(成功/失敗問わず。ローディング画面の進捗カウント用)
  const entry = { img, loaded: false, settled: false }
  img.onload = () => {
    entry.loaded = true
    entry.settled = true
  }
  img.onerror = () => {
    entry.settled = true
  }
  img.src = src
  cache.set(src, entry)
  return entry
}

// 読み込み済みならHTMLImageElementを、まだなら(あるいはpathが無ければ)nullを返す。
// nullの間はGameCanvas側が図形フォールバック描画を続ける。
export function getImage(src) {
  if (!src) return null
  const entry = cache.get(src) ?? loadImage(src)
  return entry.loaded ? entry.img : null
}

export const ASSET_PATHS = {
  // ゲーム内に実際に表示するお札カード(読みやすい漢字入り版)。基本の札のみ漢字版が無いのでそのまま。
  ofudaCard: {
    basic: p('assets/ofuda/ofuda_basic.png'),
    fire: p('assets/ofuda/ofuda_fire_kanzi.png'),
    earth: p('assets/ofuda/ofuda_earth_kanzi.png'),
    wind: p('assets/ofuda/ofuda_wind_kanzi.png'),
    ice: p('assets/ofuda/ofuda_ice_kanzi.png'),
    support: p('assets/ofuda/ofuda_support_kanzi.png'),
    harai: p('assets/ofuda/ofuda_harai_kanzi.png'),
    cannon: p('assets/ofuda/ofuda_cannon_kanzi.png'),
    sniper: p('assets/ofuda/ofuda_sniper_kanzi.png'),
    poison: p('assets/ofuda/ofuda_poison_kanzi.png'),
    thunder: p('assets/ofuda/ofuda_thunder_kanzi.png'),
    curse: p('assets/ofuda/ofuda_curse_kanzi.png'),
    koban: p('assets/ofuda/ofuda_koban_kanzi.png'),
    shiki: p('assets/ofuda/ofuda_shiki_kanzi.png'),
  },
  // スキルツリーの小さいノード用(漢字なし版。小さいと漢字が潰れるため)
  ofudaIcon: {
    basic: p('assets/ofuda/ofuda_basic.png'),
    fire: p('assets/ofuda/ofuda_fire.png'),
    earth: p('assets/ofuda/ofuda_earth.png'),
    wind: p('assets/ofuda/ofuda_wind.png'),
    ice: p('assets/ofuda/ofuda_ice.png'),
    support: p('assets/ofuda/ofuda_support.png'),
    harai: p('assets/ofuda/ofuda_harai.png'),
    cannon: p('assets/ofuda/ofuda_cannon.png'),
    sniper: p('assets/ofuda/ofuda_sniper.png'),
    poison: p('assets/ofuda/ofuda_poison.png'),
    thunder: p('assets/ofuda/ofuda_thunder.png'),
    curse: p('assets/ofuda/ofuda_curse.png'),
    koban: p('assets/ofuda/ofuda_koban.png'),
    shiki: p('assets/ofuda/ofuda_shiki.png'),
  },
  minionShiki: p('assets/ofuda/minion_shikigami.png'),
  relicIcon: {
    stat: p('assets/ui/relic_stat.png'),
    rule: p('assets/ui/relic_rule.png'),
    risk: p('assets/ui/relic_risk.png'),
  },
  wallEarth: p('assets/wallfx/wall_earth.png'),
  projectileOrb: p('assets/wallfx/projectile_orb.png'),
  effectWindGust: p('assets/wallfx/effect_wind_gust.png'),
  effectFireBurn: p('assets/wallfx/effect_fire_burn.png'),
  // 応用編の札のエフェクト(専用イラストが無い間は、GameCanvas側の簡易描画で代用する)
  effectCannonExplosion: p('assets/wallfx/effect_cannon_explosion.png'),
  effectThunderBolt: p('assets/wallfx/effect_thunder_bolt.png'),
  effectPoisonBubbles: p('assets/wallfx/effect_poison_bubbles.png'),
  effectCurseMark: p('assets/wallfx/effect_curse_mark.png'),
  effectKobanSparkle: p('assets/wallfx/effect_koban_sparkle.png'),
  effectHamayaArrow: p('assets/wallfx/effect_hamaya_arrow.png'),
  effectWardBarrier: p('assets/wallfx/effect_ward_barrier.png'),
  effectIceFrost: p('assets/wallfx/effect_ice_frost.png'),
  paperShards: [p('assets/bossfx/effect_paper_shard.png'), p('assets/bossfx/effect_paper_shard_square.png')],
  bossShockwave: p('assets/bossfx/effect_boss_shockwave.png'),
  bossSummon: p('assets/bossfx/effect_boss_summon.png'),
  iconSpirit: p('assets/ui/icon_spirit.png'),
  // スキルツリーの特殊ノード・入口・宝珠系ノードのアイコン(札のイラストを持たないノード用)
  nodeIcon: {
    extra_pick: p('assets/ui/node_extra_pick.png'),
    extra_candidate: p('assets/ui/node_extra_candidate.png'),
    lucky_drop: p('assets/ui/node_lucky_drop.png'),
    second_chance: p('assets/ui/node_second_chance.png'),
    spirit_bonus: p('assets/ui/node_spirit_bonus.png'),
    advanced_gate: p('assets/ui/node_advanced_gate.png'),
    relic_choice: p('assets/ui/node_relic_choice.png'),
    relic_reroll: p('assets/ui/node_relic_reroll.png'),
  },
  iconCoin: p('assets/ui/icon_coin.png'),
  iconDamageUp: p('assets/ui/icon_damage_up.png'),
  iconUpgradeBadge: p('assets/ui/icon_upgrade_badge.png'),
  iconKillCount: p('assets/ui/icon_kill_count.png'),
  iconTurn: p('assets/ui/icon_turn.png'),
  uiButtonFrame: p('assets/ui/ui_button_frame.png'),
  uiHudPanel: p('assets/ui/ui_hud_panel.png'),
  uiHpBarFrame: p('assets/ui/ui_hp_bar_frame.png'),
  uiTitleLogo: p('assets/ui/ui_title_logo.png'),
  titleCalligraphy: p('assets/ui/title_calligraphy.png'),
  uiPanelTexture: p('assets/ui/ui_panel_texture.jpg'),
  uiPageBackground: p('assets/ui/ui_page_background.jpg'),
  uiTreeThread: p('assets/ui/ui_tree_thread.png'),
  uiFieldFrame: p('assets/ui/ui_field_frame.png'),
  decorShide: p('assets/field/decor_shide.png'),
  decorFlowers: p('assets/field/decor_flowers.png'),
  decorLantern: p('assets/field/decor_lantern.png'),
  decorPetal: p('assets/ui/decor_petal.png'),
  characterGuide: p('assets/ui/character_ofuda_spirit.png'),
  effectHankoStamp: p('assets/ui/effect_hanko_stamp.png'),
  effectHankoStampFail: p('assets/ui/effect_hanko_stamp_fail.png'),
  effectBrushSwoosh: p('assets/ui/effect_brush_swoosh.png'),
  enemy: {
    wisp: p('assets/enemies/enemy_wisp.png'),
    onibi: p('assets/enemies/enemy_onibi.png'),
    oonyudo: p('assets/enemies/enemy_oonyudo.png'),
    kamaitachi: p('assets/enemies/enemy_kamaitachi.png'),
    aramitama: p('assets/enemies/enemy_boss_aramitama.png'),
    yukionna: p('assets/enemies/enemy_yukionna.png'),
    iwakuronushi: p('assets/enemies/enemy_iwakuronushi.png'),
    koorihime: p('assets/enemies/enemy_boss_koorihime.png'),
    kitsune: p('assets/enemies/enemy_kitsune.png'),
    kasha: p('assets/enemies/enemy_kasha.png'),
    nurikabe: p('assets/enemies/enemy_nurikabe.png'),
    magatsuhi: p('assets/enemies/enemy_boss_magatsuhi.png'),
  },
  // フィールド背景は和紙(下)+石畳(上)の2枚重ね
  fieldPaper: p('assets/field/field_paper.png'),
  fieldPath: p('assets/field/bg_field_paper.png'),
  // 章ごとの専用背景(無ければ第1章の和紙+石畳に色を重ねて代用する)
  chapterField: {
    2: { paper: p('assets/field/field_paper_ch2.png'), path: p('assets/field/bg_field_path_ch2.png') },
    3: { paper: p('assets/field/field_paper_ch3.png'), path: p('assets/field/bg_field_path_ch3.png') },
  },
  torii: p('assets/field/torii.png'),
  honden: p('assets/field/honden.png'),
}

function collectPaths(node, out) {
  if (typeof node === 'string') {
    out.push(node)
  } else if (Array.isArray(node)) {
    node.forEach((v) => collectPaths(v, out))
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((v) => collectPaths(v, out))
  }
}

// ローディング画面用: 全画像の読み込み完了(成功/404問わず)を待ち、進捗をonProgress(0〜1)で通知する。
export function preloadAllAssets(onProgress) {
  const paths = []
  collectPaths(ASSET_PATHS, paths)
  const entries = [...new Set(paths)].map(loadImage).filter(Boolean)
  const total = entries.length
  if (total === 0) {
    onProgress?.(1)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    let doneCount = 0
    const checkDone = () => {
      doneCount += 1
      onProgress?.(doneCount / total)
      if (doneCount >= total) resolve()
    }
    entries.forEach((entry) => {
      if (entry.settled) {
        checkDone()
      } else {
        entry.img.addEventListener('load', checkDone, { once: true })
        entry.img.addEventListener('error', checkDone, { once: true })
      }
    })
  })
}

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}
