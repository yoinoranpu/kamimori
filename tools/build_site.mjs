// ホームページ(site/)を生成する。ネタバレを避けるため、載せるのは序盤の札と第一章の敵・舞台だけ。
// 2章以降は「？？？」で伏せる。名前や説明は src/game/constants.js から取るので、変えたら再デプロイで反映される。
// 使い方: node tools/build_site.mjs <出力先フォルダ>
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
if (!out) throw new Error('出力先フォルダを指定してください')

const { OFUDA_TYPES, ENEMY_TYPES } = await import(pathToFileURL(join(root, 'src/game/constants.js')).href)

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const A = 'play/assets'

// 序盤に使える札だけ(応用編の札は伏せる)
const BASIC_OFUDA = ['basic', 'fire', 'earth', 'wind', 'ice', 'support']
const cards = BASIC_OFUDA.map((id, i) => {
  const d = OFUDA_TYPES[id]
  const tilt = ((i % 5) - 2) * 2.2
  const src = id === 'basic' ? 'ofuda_basic' : `ofuda_${id}_kanzi`
  return `<div class="card" style="--tilt:${tilt}deg"><img src="${A}/ofuda/${src}.webp" alt="${esc(d.name)}" loading="lazy" width="88" height="132"><b>${esc(d.name)}</b><span>${esc(d.flavor)}</span></div>`
}).join('')

// 第一章の敵だけ
const YOKAI = [
  ['wisp', '雑霊', '一撃で散る雑霊。群れで押し寄せてくる。'],
  ['onibi', '鬼火', '基本の妖怪。数で押してくる。'],
  ['oonyudo', '大入道', '硬くてゆっくり。倒せば大きな通貨。'],
  ['kamaitachi', '鎌鼬', '速くて、お札を斬りつけてくる。'],
  ['aramitama', '荒魂(ボス)', '荒ぶる魂。範囲攻撃と雑魚の召喚を使う。'],
]
const yokai = YOKAI.map(([id, label, text]) => {
  const d = ENEMY_TYPES[id]
  const file = d.isBoss ? `enemy_boss_${id}` : `enemy_${id}`
  return `<div class="yo"><span class="chip${d.isBoss ? ' boss' : ''}">${d.isBoss ? '第一章ボス' : '第一章'}</span><img src="${A}/enemies/${file}.webp" alt="${esc(d.name)}" loading="lazy"><b>${esc(label)}</b><p>${esc(text)}</p></div>`
}).join('')

// 章: 第一章だけ見せて、あとは伏せる
const chapters = `<article class="chapter" style="background-image:url('${A}/field/field_paper.webp')"><img class="boss" src="${A}/enemies/enemy_boss_aramitama.webp" alt="" loading="lazy"><h3>第一章</h3><p class="place">社の参道</p><p>鳥居から本殿へ続く参道。鬼火と大入道の行進を止め、荒魂に挑む。</p></article>
<article class="chapter locked"><h3>第二章</h3><p class="place">？ ？ ？</p><p>先へ進んだ者だけが知る。</p></article>
<article class="chapter locked"><h3>第三章</h3><p class="place">？ ？ ？</p><p>先へ進んだ者だけが知る。</p></article>`

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
    <div class="feature"><span class="no">壱</span><h3>お札を置いて守る</h3><p>毎ターン配られるお札から選んで置く、シンプルで奥の深い配置の戦い。壁で敵を誘導して、射程に誘い込もう。</p></div>
    <div class="feature"><span class="no">弐</span><h3>遊ぶほど育つ</h3><p>稼いだ通貨でスキルの木を育てる。奥へ進むほど、新しい札や力が姿を見せる。</p></div>
    <div class="feature"><span class="no">参</span><h3>戦いのたびに選ぶ</h3><p>強敵を倒すと授かる不思議な力。何を選ぶかで、その周回の戦い方が変わる。</p></div>
    <div class="feature"><span class="no">肆</span><h3>案内役がついている</h3><p>札の精が、遊び方や敵の弱点をやさしく教えてくれる。初めてでも安心。</p></div>
  </div>
</div></section>

<section id="ofuda"><div class="wrap">
  <h2>お札<small>OFUDA</small></h2>
  <p class="lead">まずは、この六種から。遊び進めると、まだ見ぬ札が現れる。</p>
  <div class="cards">
${cards}
  </div>
</div></section>

<section class="paper" id="chapters"><div class="wrap">
  <h2>三つの章<small>CHAPTERS</small></h2>
  <p class="lead">物語は三つの章。各章の最後には、強敵が待っている。</p>
  <div class="chapters">
${chapters}
  </div>
</div></section>

<section id="yokai"><div class="wrap">
  <h2>妖怪<small>YOKAI</small></h2>
  <p class="lead">第一章に現れる妖怪たち。弱点や耐性は、案内役が教えてくれる。</p>
  <div class="yokai">
${yokai}
  </div>
</div></section>

<section class="paper" id="guide"><div class="wrap">
  <h2>案内役<small>GUIDE</small></h2>
  <p class="lead">遊びの途中で、そっと声をかけてくれる。</p>
  <div class="guide">
    <img src="${A}/ui/character_ofuda_spirit.webp" alt="札の精" loading="lazy" width="200">
    <div class="bubble">札の精だよ。札を置く場所に迷ったら、私に聞いてね。敵の弱点も、ちゃんと教えてあげる。一緒に、社を守ろう!</div>
  </div>
</div></section>

<section id="howto"><div class="wrap">
  <h2>遊び方<small>HOW TO PLAY</small></h2>
  <p class="lead">操作は、選んで、置いて、見守るだけ。</p>
  <ol class="steps">
    <li><div><b>札を選んで置く</b><p>毎ターン配られるお札から選び、フィールドの好きな場所へ。スマホは札をそのままドラッグして置ける。</p></div></li>
    <li><div><b>ウェーブを見守る</b><p>「ウェーブ開始」で妖怪が押し寄せる。本殿に着かれたら負け。壁で足止めして、射程に誘い込もう。</p></div></li>
    <li><div><b>通貨で強くなる</b><p>倒した妖怪から通貨が手に入る。スキルの木を育てて、次の周回へ。</p></div></li>
    <li><div><b>強敵を倒して、さらに奥へ</b><p>強敵を倒すと、不思議な力を授かる。選んだ力に合わせて札を選び、どこまで行けるか試そう。</p></div></li>
  </ol>
</div></section>
</main>

<footer>
  <a class="cta" href="play/">遊ぶ</a>
  <p><a href="https://github.com/yoinoranpu/kamimori">GitHub</a></p>
  <div class="legal" id="about">
    <h3>プライバシーと権利について</h3>
    <p><b>プライバシー:</b> このゲームは、名前やメールアドレスなどの個人情報を集めません。アクセス解析やクッキーも使っていません。セーブデータは、お使いのブラウザの中(localStorage)にだけ保存され、外部に送られません。</p>
    <p><b>外部サービス:</b> 文字の表示にGoogle Fontsを使っています。ページを開くと、フォントの取得のためにGoogleのサーバーへアクセスが発生します(IPアドレス等がGoogleに届く場合があります)。</p>
    <p><b>イラストについて:</b> ゲーム内のイラストの一部は、生成AIを用いて作成しています。</p>
    <p><b>権利:</b> ゲームのプログラム・イラスト・文章の無断転載、再配布、二次利用はお断りしています。</p>
  </div>
  <p>© 紙守り</p>
</footer>
</body>
</html>
`

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'index.html'), html)
copyFileSync(join(root, 'site/style.css'), join(out, 'style.css'))
console.log('ホームページを生成しました:', out)
