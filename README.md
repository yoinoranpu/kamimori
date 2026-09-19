# 紙守り(かみもり)

和紙と神社をモチーフにした、お札タワーディフェンス。お札を置いて妖怪の行進から本殿を守り、
稼いだ通貨・御霊でスキルツリーを育てながら、3つの章のボスに挑みます。

**ホームページ:** https://yoinoranpu.github.io/kamimori/  
**遊ぶ:** https://yoinoranpu.github.io/kamimori/play/

## 遊び方
- 毎ターン配られるお札から選んで、フィールドに置く → 「ウェーブ開始」で妖怪が押し寄せる。
- 妖怪を本殿に到達させたら負け。倒すと通貨が入り、周回の終わりにスキルツリーの強化に使える。
- 章ボス(と第2章の途中の荒魂)を倒すと**宝珠**を1つ選べる。その周回だけの強化で、次の札選びの方向性を決める。
- ボスを倒して得る**御霊**で、スキルツリーの右側「応用編」(新しい札・特殊ノード・4倍速など)が開く。
- 敵には弱点・耐性・シールド(祓の札が得意)などがあり、案内キャラが教えてくれる。
- セーブはブラウザ内(localStorage)。スキルツリー画面の「セーブ管理」から引き継ぎコードの書き出し/読み込みができる。

## 開発
```bash
npm install
npm run dev        # 開発サーバー
npm run build      # dist/ にビルド
npm run optimize   # public/assets の新しいPNG/JPGをWebPに変換(元画像は assets_src/ へ退避)
npm run deploy     # ゲームとホームページ(site/)を合成して GitHub Pages(gh-pagesブランチ)へ公開
```

- React 19 + Vite。ゲームの本体(`src/game/engine.js`)は描画・音から独立した純粋なシミュレーション。
- 効果音はWeb Audio APIで合成(音声ファイルなし)。
- 画像は `public/assets/`(WebP)。元画像は `assets_src/`。
- ホームページは `site/style.css` と `tools/build_site.mjs`(札・妖怪の一覧は `constants.js` から自動生成)。
- 企画書: `ofuda_td_kikakusho.md`

## クレジット
イラスト・企画・ゲームデザイン: 作者。実装は Claude(Anthropic)との共同開発。
