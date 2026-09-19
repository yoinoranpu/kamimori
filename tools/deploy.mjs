// ホームページ(site/)とゲーム(dist/ → play/)を合成して、GitHub Pages 用の gh-pages ブランチへ
// 強制プッシュする(履歴は毎回作り直し)。公開先: /(ホームページ) と /play/(ゲーム本体)。
// 使い方: npm run deploy   (事前に `git remote` に origin が設定されていること)
import { execSync } from 'node:child_process'
import { mkdtempSync, cpSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

run('npm run build')
const remote = out('git remote get-url origin')
const tmp = mkdtempSync(join(tmpdir(), 'kamimori-pages-'))
cpSync('dist', join(tmp, 'play'), { recursive: true })
run(`node tools/build_site.mjs "${tmp}"`)
writeFileSync(join(tmp, '.nojekyll'), '')
run('git init -q -b gh-pages', tmp)
run('git add -A', tmp)
run(`git commit -q -m "deploy ${new Date().toISOString()}"`, tmp)
run(`git push -f "${remote}" gh-pages`, tmp)
rmSync(tmp, { recursive: true, force: true })
console.log('\n公開しました: https://yoinoranpu.github.io/kamimori/ (ゲーム本体は /play/ 、反映まで1〜2分かかることがあります)')
