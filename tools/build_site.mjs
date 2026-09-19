// ホームページ(site/)を生成する。札・妖怪の一覧は src/game/constants.js から作るので、
// ゲーム側の名前や説明を変えたら、再デプロイするだけでホームページにも反映される。
// 使い方: node tools/build_site.mjs <出力先フォルダ>
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
if (!out) throw new Error('出力先フォルダを指定してください')

const { OFUDA_TYPES, ENEMY_TYPES } = await import(pathToFileURL(join(root, 'src/game/constants.js')).href)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const A = 'play/assets'

// 札(序盤に使えるもの → 応用編で解放するもの)
const BASIC_OFUDA = ['basic', 'fire', 'earth', 'wind', 'ice', 'support']
const ADVANCED_OFUDA = ['harai', 'cannon', 'sniper', 'poison', 'thunder', 'curse', 'koban', 'shiki']
const cardHtml = (id, tag, i) => {
  const d = OFUDA_TYPES[id]
  const tilt = ((i % 5) - 2) * 2.2
  return `<div class="card" style="--tilt:${tilt}deg"><img src="${A}/ofuda/${id === 'basic' ? 'ofuda_basic' : `ofuda_${id}_kanzi`}.webp" alt="${esc(d.name)}" loading="lazy" width="88" height="132"><em>${tag}</em><b>${esc(d.name)}</b><span>${esc(d.flavor)}</span></div>`
}
const cards = [...BASIC_OFUDA.map((id, i) => cardHtml(id, '序盤', i)), ...ADVANCED_OFUDA.map((id, i) => cardHtml(id, '応用編', i + 6))].join('\n')

// 妖怪
const YOKAI = [
  ['wisp', '第一章', '一撃で散る雑霊。群れで押し寄せてくる。'],
  ['onibi', '第一章', '基本の妖怪。数で押してくる。'],
  ['oonyudo', '第一章', '硬くてゆっくり。倒せば大きな通貨。'],
  ['kamaitachi', '第一章', '速くて、お札を斬りつけてくる。'],
  ['aramitama', '第一章ボス', '荒ぶる魂。範囲攻撃と雑魚の召喚を使う。'],
  ['yukionna', '第二章', '火に弱く、氷を寄せつけない。'],
  ['iwakuronushi', '第二章', '重すぎて風では動かない。'],
  ['koorihime', '第二章ボス', '氷雨の主。氷も鈍足も通じない。'],
  ['kitsune', '第三章', 'シールドをまとう。祓の札が効く。'],
  ['kasha', '第三章', '燃える車輪。火が効かず、氷に弱い。'],
  ['nurikabe', '第三章', 'シールド持ちの巨大な壁。'],
  ['magatsuhi', '第三章ボス', '黄泉の底に潜む大禍津日。'],
]
const yokai = YOKAI.map(([id, chip, text]) => {
  const d = ENEMY_TYPES[id]
  const file = d.isBoss ? `enemy_boss_${id}` : `enemy_${id}`
  return `<div class="yo"><span class="chip${d.isBoss ? ' boss' : ''}">${chip}</span><img src="${A}/enemies/${file}.webp" alt="${esc(d.name)}" loading="lazy"><b>${esc(d.name)}</b><p>${esc(text)}</p></div>`
}).join('\n')

// 章
const CHAPTERS = [
  ['第一章', '社の参道', 'field/field_paper.webp', 'enemies/enemy_boss_aramitama.webp', '鳥居から本殿へ続く参道。鬼火と大入道の行進を止め、荒魂に挑む。'],
  ['第二章', '雪の峠', 'field/field_paper_ch2.webp', 'enemies/enemy_boss_koorihime.webp', '雪深い峠。雪女の氷に火を、岩黒主の重さに祓を。途中には荒魂が再び現れる。'],
  ['第三章', '黄泉の底', 'field/field_paper_ch3.webp', 'enemies/enemy_boss_magatsuhi.webp', '妖の巣くう黄泉。シールドをまとう敵を、祓の札で打ち破れ。'],
]
const chapters = CHAPTERS.map(
  ([n, place, bg, boss, text]) =>
    `<article class="chapter" style="background-image:url('${A}/${bg}')"><img class="boss" src="${A}/${boss}" alt="" loading="lazy"><h3>${n}</h3><p class="place">${place}</p><p>${esc(text)}</p></article>`,
).join('\n')

const petals = Array.from({ length: 14 }, (_, i) => {
  const left = (i * 7.3 + 3) % 100
  const dur = 9 + ((i * 1.7) % 7)
  const delay = -((i * 2.3) % 12)
  const size = 14 + ((i * 5) % 14)
  return `<img class="petal" src="${A}/ui/decor_petal.webp" alt="" style="left:${left}%;width:${size}px;animation-duration:${dur}s;animation-delay:${delay}s">`
}).join('')

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>紙守り — お札タワーディフェンス</title>
<meta name="description" content="和紙と神社の世界で、お札を置いて妖怪の行進から本殿を守るタワーディフェンス。ブラウザですぐ遊べる無料ゲーム。">
<meta property="og:title" content="紙守り — お札タワーディフェンス">
<meta property="og:description" content="お札を置いて妖怪の行進から本殿を守る、和紙と神社のタワーディフェンス。">
<meta property="og:type" content="website">
<meta property="og:image" content="https://yoinoranpu.github.io/kamimori/${A}/ui/ui_title_logo.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/webp" href="${A}/ofuda/ofuda_basic.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600&family=Yuji+Syuku&display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="nav"><div class="wrap">
  <a class="brand" href="#top">紙守り</a>
  <ul><li><a href="#features">特徴</a></li><li><a href="#ofuda">お札</a></li><li><a href="#chapters">三つの章</a></li><li><a href="#yokai">妖怪</a></li><li><a href="#howto">遊び方</a></li></ul>
  <a class="play" href="play/">遊ぶ</a>
</div></header>

<main id="top">
<div class="hero">
  ${petals}
  <div class="wrap">
    <div class="logo"><img src="${A}/ui/ui_title_logo.webp" alt="紙守り" width="760"><img class="callig" src="${A}/ui/title_calligraphy.webp" alt=""></div>
    <p class="tagline">札を置き、社を守れ。</p>
    <p class="sub">和紙と神社の世界で、お札を置いて妖怪の行進から本殿を守る。<br>登録もインストールも不要、ブラウザですぐ遊べる無料のタワーディフェンス。</p>
    <a class="cta" href="play/">遊ぶ</a>
    <p class="links"><a href="https://github.com/yoinoranpu/kamimori">GitHub</a></p>
  </div>
</div>

<section class="paper" id="features"><div class="wrap">
  <h2>特徴<small>FEATURES</small></h2>
  <p class="lead">遊ぶたびに、少しずつ強く、少しずつ奥へ。</p>
  <div class="features">
    <div class="feature"><span class="no">壱</span><h3>お札を置いて守る</h3><p>毎ターン配られるお札から選んで置く、シンプルで奥の深い配置の戦い。壁で敵を誘導し、火や風、雷を組み合わせよう。</p></div>
    <div class="feature"><span class="no">弐</span><h3>三つの章、ボス戦</h3><p>社の参道、雪の峠、黄泉の底。章ごとに敵も景色も変わり、ボスを倒すと宝珠を授かる。</p></div>
    <div class="feature"><span class="no">参</span><h3>宝珠で戦い方が変わる</h3><p>章ボスを倒して選ぶ、その周回限りの強化。何を選ぶかで、次に頼りたい札が決まる。</p></div>
    <div class="feature"><span class="no">肆</span><h3>育つスキルツリー</h3><p>稼いだ通貨で木を育て、ボスの御霊で右側の「応用編」を開く。新しい札と特殊な力が、遊ぶほど増えていく。</p></div>
  </div>
</div></section>

<section id="ofuda"><div class="wrap">
  <h2>お札<small>OFUDA</small></h2>
  <p class="lead">序盤から使える六種と、御霊で解放する応用編の八種。</p>
  <div class="cards">
${cards}
  </div>
</div></section>

<section class="paper" id="chapters"><div class="wrap">
  <h2>三つの章<small>CHAPTERS</small></h2>
  <p class="lead">各章の最後にはボスが待つ。倒すたびに宝珠を選び、次の章へ。</p>
  <div class="chapters">
${chapters}
  </div>
</div></section>

<section id="yokai"><div class="wrap" style="color:var(--sumi)">
  <h2 style="color:var(--washi)">妖怪<small style="color:var(--washi)">YOKAI</small></h2>
  <p class="lead" style="color:var(--washi)">弱点や耐性、シールドを持つ敵も。案内キャラが教えてくれる。</p>
  <div class="yokai">
${yokai}
  </div>
</div></section>

<section class="paper" id="howto"><div class="wrap">
  <h2>遊び方<small>HOW TO PLAY</small></h2>
  <p class="lead">操作は、選んで、置いて、見守るだけ。</p>
  <ol class="steps" style="color:var(--sumi)">
    <li><div><b>札を選んで置く</b><p>毎ターン配られるお札から選び、フィールドの好きな場所へ。スマホは札をそのままドラッグして置ける。</p></div></li>
    <li><div><b>ウェーブを見守る</b><p>「ウェーブ開始」で妖怪が押し寄せる。本殿に着かれたら負け。壁で足止めして、射程に誘い込もう。</p></div></li>
    <li><div><b>通貨と御霊で強くなる</b><p>倒した妖怪から通貨、ボスから御霊。スキルツリーを育てて、次の周回へ。</p></div></li>
    <li><div><b>宝珠を選んで章を進む</b><p>章ボスを倒すと宝珠を1つ選べる。選んだ宝珠に合わせて札を選び、三つの章を踏破しよう。</p></div></li>
  </ol>
</div></section>
</main>

<footer>
  <a class="cta" href="play/">遊ぶ</a>
  <p>セーブはブラウザ内に保存されます。 / <a href="https://github.com/yoinoranpu/kamimori">GitHub</a></p>
  <p>© 紙守り</p>
</footer>
</body>
</html>
`

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'index.html'), html)
copyFileSync(join(root, 'site/style.css'), join(out, 'style.css'))
console.log('ホームページを生成しました:', out)
