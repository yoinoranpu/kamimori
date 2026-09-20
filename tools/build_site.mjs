// ホームページ(site/)を生成する。ネタバレを避けるため、2章以降・札・妖怪の詳細は載せていない
// (画像とキャッチコピー、遊び方の概要だけ)。
// 使い方: node tools/build_site.mjs <出力先フォルダ>
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
if (!out) throw new Error('出力先フォルダを指定してください')

const esc = (t) => String(t)
const A = 'play/assets'

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
  <ul><li><a href="#features">特徴</a></li><li><a href="#guide">案内役</a></li><li><a href="#howto">遊び方</a></li></ul>
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

<section id="guide"><div class="wrap">
  <h2>案内役<small>GUIDE</small></h2>
  <p class="lead">遊びの途中で、そっと声をかけてくれる。</p>
  <div class="guide">
    <img src="${A}/ui/character_ofuda_spirit.webp" alt="札の精" loading="lazy" width="200">
    <div class="bubble">札の精だよ。札を置く場所に迷ったら、私に聞いてね。敵の弱点も、ちゃんと教えてあげる。一緒に、社を守ろう!</div>
  </div>
</div></section>

<section class="paper" id="howto"><div class="wrap">
  <h2>遊び方<small>HOW TO PLAY</small></h2>
  <p class="lead">操作は、選んで、置いて、見守るだけ。</p>
  <ol class="steps" style="color:var(--sumi)">
    <li><div><b>札を選んで置く</b><p>毎ターン配られるお札から選び、フィールドの好きな場所へ。スマホは札をそのままドラッグして置ける。</p></div></li>
    <li><div><b>ウェーブを見守る</b><p>「ウェーブ開始」で妖怪が押し寄せる。本殿に着かれたら負け。壁で足止めして、射程に誘い込もう。</p></div></li>
    <li><div><b>通貨で強くなる</b><p>倒した妖怪から通貨が手に入る。スキルの木を育てて、次の周回へ。</p></div></li>
    <li><div><b>強敵を倒して、さらに奥へ</b><p>強敵を倒すと、不思議な力を授かる。選んだ力に合わせて札を選び、どこまで行けるか試そう。</p></div></li>
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
