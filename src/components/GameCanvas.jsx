import { useEffect, useRef } from 'react'
import { getChapter } from '../game/chapters.js'
import { FIELD, OFUDA_TYPES, ENEMY_TYPES, BOSS_ENTRANCE_SECONDS } from '../game/constants.js'
import { step } from '../game/engine.js'
import { getSpawnYRange } from '../game/waves.js'
import { WALL_SPAN_PX } from '../game/grid.js'
import { ASSET_PATHS, getImage } from '../game/assets.js'
import { playLaunch, playHit, playEnemyDeath } from '../game/sound.js'

const CARD_W = 32
const CARD_H = 48

// 白/クリーム基調で作った素材(除霊の球・紙片)を、札や敵の色でティントして使い回すための
// キャッシュ。毎フレーム作り直すと重いので、画像+色の組み合わせごとに一度だけ生成する。
const tintCache = new Map()
function getTinted(img, color) {
  if (!img) return null
  const key = `${img.src}__${color}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const off = document.createElement('canvas')
  off.width = img.naturalWidth || img.width
  off.height = img.naturalHeight || img.height
  const octx = off.getContext('2d')
  octx.drawImage(img, 0, 0)
  octx.globalCompositeOperation = 'source-atop'
  octx.fillStyle = color
  octx.fillRect(0, 0, off.width, off.height)
  tintCache.set(key, off)
  return off
}

function drawImageCentered(ctx, img, x, y, w, h) {
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h)
}

// HPバー。枠画像が読み込まれていればそれを幅いっぱいに伸ばして下地にし、
// まだなら従来通り黒背景の矩形だけで表示する(どちらでも上の緑の残量バーは同じ)
function drawHpBar(ctx, x, y, width, ratio) {
  const height = 5
  const frame = getImage(ASSET_PATHS.uiHpBarFrame)
  if (frame) {
    ctx.drawImage(frame, x - width / 2 - 3, y - height / 2 - 2, width + 6, height + 4)
  } else {
    ctx.fillStyle = '#00000055'
    ctx.fillRect(x - width / 2, y - height / 2, width, height)
  }
  ctx.fillStyle = '#7fd858'
  ctx.fillRect(x - width / 2, y - height / 2, width * Math.max(ratio, 0), height)
}

// 石畳はフィールド全体に引き伸ばすと1枚1枚の石が巨大に見えてしまうため、
// 和紙の上に等倍に近いサイズで何枚か並べ、中央に横断する帯状の道として敷く。
// (妖怪の出現レーンとは無関係の、あくまで背景装飾)
const PATH_BAND_HEIGHT = 170

function drawStonePath(ctx, img, width, height) {
  const tileW = PATH_BAND_HEIGHT * ((img.naturalWidth || img.width) / (img.naturalHeight || img.height))
  const y = height / 2 - PATH_BAND_HEIGHT / 2
  const tileCount = Math.ceil(width / tileW)
  ctx.save()
  // 石畳の柄が主張しすぎて背景として騒がしく見えるとのフィードバックがあったため、
  // 一旦少し薄くして目立ちを抑える(根本的に気になるようなら模様自体の作り直しを検討)
  ctx.globalAlpha = 0.6
  for (let i = 0; i < tileCount; i++) {
    const x = i * tileW
    if (i % 2 === 1) {
      // 同じ画像の繰り返し感を減らすため、1枚おきに左右反転して並べる
      ctx.save()
      ctx.translate(x + tileW, y)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, tileW, PATH_BAND_HEIGHT)
      ctx.restore()
    } else {
      ctx.drawImage(img, x, y, tileW, PATH_BAND_HEIGHT)
    }
  }
  ctx.restore()
}

function drawField(ctx, turn, chapter = 1) {
  const { width, height, toriiX, toriiY, hondenX, hondenY } = FIELD

  const chapterArt = ASSET_PATHS.chapterField?.[chapter]
  const chapterPaper = chapterArt ? getImage(chapterArt.paper) : null
  const paper = chapterPaper ?? getImage(ASSET_PATHS.fieldPaper)
  if (paper) {
    ctx.drawImage(paper, 0, 0, width, height)
  } else {
    ctx.fillStyle = '#efe4c8'
    ctx.fillRect(0, 0, width, height)
  }
  const path = (chapterArt && getImage(chapterArt.path)) || getImage(ASSET_PATHS.fieldPath)
  if (path) drawStonePath(ctx, path, width, height)
  // 章ごとの空気感(雪山は青白く、黄泉は暗い紫に)。専用の背景画像がある章では色を重ねない。
  const tint = chapterPaper ? null : getChapter(chapter).tint
  if (tint) {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, width, height)
  }

  // 妖怪の出現エリア(ターンが進むほど広がる。単一レーンではないことを示す)
  const spawnRange = getSpawnYRange(turn)
  ctx.strokeStyle = '#a5423a88'
  ctx.lineWidth = 3
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(toriiX, spawnRange.min)
  ctx.lineTo(toriiX, spawnRange.max)
  ctx.stroke()
  ctx.setLineDash([])

  // 防衛ライン(本殿の1点ではなく、このxラインに到達したら防衛失敗)
  ctx.strokeStyle = '#5b463688'
  ctx.lineWidth = 3
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(hondenX - 40, 0)
  ctx.lineTo(hondenX - 40, height)
  ctx.stroke()
  ctx.setLineDash([])

  const torii = getImage(ASSET_PATHS.torii)
  if (torii) {
    drawImageCentered(ctx, torii, toriiX, toriiY - 25, 80, 130)
  } else {
    ctx.fillStyle = '#a5423a'
    ctx.fillRect(toriiX - 24, toriiY - 60, 8, 90)
    ctx.fillRect(toriiX + 16, toriiY - 60, 8, 90)
    ctx.fillRect(toriiX - 32, toriiY - 60, 64, 10)
  }

  const honden = getImage(ASSET_PATHS.honden)
  if (honden) {
    drawImageCentered(ctx, honden, hondenX + 20, hondenY - 20, 110, 140)
  } else {
    ctx.fillStyle = '#5b4636'
    ctx.fillRect(hondenX - 10, hondenY - 45, 60, 90)
    ctx.fillStyle = '#8a6a4a'
    ctx.beginPath()
    ctx.moveTo(hondenX - 20, hondenY - 45)
    ctx.lineTo(hondenX + 20, hondenY - 70)
    ctx.lineTo(hondenX + 60, hondenY - 45)
    ctx.closePath()
    ctx.fill()
  }
}

function drawTowerRanges(ctx, towers) {
  for (const t of towers) {
    const def = OFUDA_TYPES[t.type]
    if (!def.range) continue
    ctx.beginPath()
    ctx.arc(t.x, t.y, def.range, 0, Math.PI * 2)
    ctx.fillStyle = `${def.accent}18`
    ctx.fill()
    ctx.strokeStyle = `${def.accent}66`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawOfudaCard(ctx, typeId, x, y) {
  const def = OFUDA_TYPES[typeId]
  const img = getImage(ASSET_PATHS.ofudaCard[typeId])
  if (img) {
    drawImageCentered(ctx, img, x, y, CARD_W, CARD_H)
    return
  }
  // 画像が未読み込みの間だけ図形でフォールバック
  ctx.fillStyle = def.color
  ctx.strokeStyle = def.accent
  ctx.lineWidth = 2
  ctx.fillRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H)
  ctx.strokeRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H)
  ctx.fillStyle = def.accent
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(def.label, x, y + 5)
}

function drawWall(ctx, x, y) {
  const img = getImage(ASSET_PATHS.wallEarth)
  if (img) {
    drawImageCentered(ctx, img, x, y, 48, WALL_SPAN_PX)
  } else {
    const def = OFUDA_TYPES.earth
    ctx.fillStyle = def.color
    ctx.strokeStyle = def.accent
    ctx.lineWidth = 2
    ctx.fillRect(x - 16, y - WALL_SPAN_PX / 2, 32, WALL_SPAN_PX)
    ctx.strokeRect(x - 16, y - WALL_SPAN_PX / 2, 32, WALL_SPAN_PX)
  }
  // 「土の札を置いた場所に、土壁が重なって存在する」イメージなのでカードも上から重ねて描く
  drawOfudaCard(ctx, 'earth', x, y)
}

function drawPlacementPreview(ctx, pos, typeId) {
  if (!pos || !typeId) return
  const def = OFUDA_TYPES[typeId]
  if (def.range) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, def.range, 0, Math.PI * 2)
    ctx.fillStyle = `${def.accent}22`
    ctx.fill()
    ctx.strokeStyle = def.accent
    ctx.lineWidth = 2
    ctx.setLineDash([6, 6])
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.globalAlpha = 0.75
  if (def.kind === 'wall') {
    drawWall(ctx, pos.x, pos.y)
  } else {
    drawOfudaCard(ctx, typeId, pos.x, pos.y)
  }
  ctx.globalAlpha = 1
}

function drawTowers(ctx, towers, animTime) {
  for (const t of towers) {
    const def = OFUDA_TYPES[t.type]
    const isWall = def.kind === 'wall'
    // 発射直後だけ軽く跳ねさせる(差分アニメの代わりのジューシーな演出)
    const fireRecoil = t.fireFlash > 0 ? 1 + (t.fireFlash / 0.15) * 0.18 : 1
    // 配置した直後は少し大きく浮かび上がってから収まる着地演出
    const placedRatio = t.placedFlash > 0 ? t.placedFlash / 0.25 : 0
    const placedRecoil = 1 + placedRatio * 0.6
    const placedAlpha = 1 - placedRatio * 0.7
    // 何もしていない時間帯でも画面に動きがあるよう、置いた札は常に紙が風にそよぐ
    // ような微妙な回転を続ける(idを位相のズレに使い、全部が同じタイミングで
    // 揺れて不自然にならないようにする。壁は土+紙の複合物なので揺れを控えめにする)
    const swayAngle = Math.sin(animTime * 1.1 + t.id * 0.7) * (isWall ? 0.02 : 0.045)
    ctx.save()
    ctx.globalAlpha = placedAlpha
    ctx.translate(t.x, t.y)
    ctx.rotate(swayAngle)
    ctx.scale(fireRecoil * placedRecoil, fireRecoil * placedRecoil)
    ctx.translate(-t.x, -t.y)
    if (isWall) {
      drawWall(ctx, t.x, t.y)
    } else {
      drawOfudaCard(ctx, t.type, t.x, t.y)
    }
    ctx.restore()

    if (t.hp < t.maxHp) {
      const ratio = t.hp / t.maxHp
      const barY = isWall ? t.y - WALL_SPAN_PX / 2 - 10 : t.y - CARD_H / 2 - 10
      drawHpBar(ctx, t.x, barY, 32, ratio)
    }
  }
}

function drawEnemies(ctx, enemies, animTime) {
  for (const e of enemies) {
    const def = ENEMY_TYPES[e.type]
    const isEntering = e.entranceTimeLeft > 0
    // 登場演出中: 拡大した状態から縮みながらフェードインする(値が大きい→開始直後)
    const entranceRatio = isEntering ? e.entranceTimeLeft / BOSS_ENTRANCE_SECONDS : 0
    const entranceScale = isEntering ? 1.8 - 0.8 * (1 - entranceRatio) : 1
    const entranceAlpha = isEntering ? 1 - entranceRatio : 1
    const bob = isEntering ? 0 : Math.sin(animTime * 2 + e.id) * 4
    const drawY = e.y + bob
    // 「倒した敵が何か分かりにくい」との指摘を受けて表示サイズだけを底上げする
    // (def.radiusは敵同士の衝突判定にも使う値なので、そちらは変えずに見た目だけ拡大する)
    const size = def.radius * 4.2 * entranceScale
    // 紙が風にひらひら揺れているような、横幅だけが周期的に縮む「紙の薄さ」演出
    const flutter = isEntering ? 1 : 0.78 + 0.22 * Math.abs(Math.cos(animTime * 1.6 + (e.wobbleSeed ?? 0)))

    // 継続燃焼中は敵の後ろに炎エフェクトを重ねる
    if (e.burnTimeLeft > 0) {
      const burnImg = getImage(ASSET_PATHS.effectFireBurn)
      if (burnImg) {
        ctx.globalAlpha = 0.9
        drawImageCentered(ctx, burnImg, e.x, drawY, size * 1.6, size * 1.6)
        ctx.globalAlpha = 1
      }
    }

    // 加護: 守りが生きている間は薄い結界をまとう(モンスターの背後に描く)
    if (e.shield > 0) {
      const wardImg = getImage(ASSET_PATHS.effectWardBarrier)
      if (wardImg) {
        ctx.globalAlpha = 0.8
        drawImageCentered(ctx, wardImg, e.x, drawY, size * 1.25, size * 1.25)
        ctx.globalAlpha = 1
      } else {
        ctx.strokeStyle = 'rgba(138,111,196,0.85)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.arc(e.x, drawY, size * 0.55 + Math.sin(animTime * 3) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 毒: 緑の泡が立ち上る / 呪い: 頭上に紫の印
    // 毒・呪いのエフェクトはモンスターの背後に描く(スプライトを隠さないため)
    const poisonImg = e.poisonTimeLeft > 0 ? getImage(ASSET_PATHS.effectPoisonBubbles) : null
    if (poisonImg) {
      ctx.globalAlpha = 0.85
      drawImageCentered(ctx, poisonImg, e.x, drawY, size * 1.3, size * 1.3)
      ctx.globalAlpha = 1
    } else if (e.poisonTimeLeft > 0) {
      ctx.fillStyle = '#6e9b3a'
      for (let i = 0; i < 3; i++) {
        const ph = (animTime * 0.9 + i / 3 + e.id * 0.13) % 1
        ctx.globalAlpha = 1 - ph
        ctx.beginPath()
        ctx.arc(e.x + (i - 1) * def.radius * 0.6, drawY - ph * def.radius * 1.6, 2.5 + i * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    const curseImg = e.curseTimeLeft > 0 ? getImage(ASSET_PATHS.effectCurseMark) : null
    if (curseImg) {
      drawImageCentered(ctx, curseImg, e.x, drawY - size / 2 - 12, 28, 28)
    } else if (e.curseTimeLeft > 0) {
      ctx.strokeStyle = '#a06ac8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(e.x, drawY - size / 2 - 12, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(e.x - 4, drawY - size / 2 - 16)
      ctx.lineTo(e.x + 4, drawY - size / 2 - 8)
      ctx.moveTo(e.x + 4, drawY - size / 2 - 16)
      ctx.lineTo(e.x - 4, drawY - size / 2 - 8)
      ctx.stroke()
    }

    // 吹き飛ばされている間は、押されている向きへ風のエフェクトを流す
    if (e.knockbackTimeLeft > 0 && e.knockbackDir) {
      const gustImg = getImage(ASSET_PATHS.effectWindGust)
      if (gustImg) {
        const angle = Math.atan2(e.knockbackDir.dy, e.knockbackDir.dx)
        ctx.save()
        ctx.translate(e.x, drawY)
        ctx.rotate(angle)
        ctx.globalAlpha = 0.85
        ctx.drawImage(gustImg, -size * 0.2, -size * 0.9, size * 1.8, size * 1.8)
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }

    const img = getImage(ASSET_PATHS.enemy[e.type])
    ctx.save()
    ctx.globalAlpha = entranceAlpha
    ctx.translate(e.x, drawY)
    // イラストが左向きに描かれている敵は、進行方向(右)へ向くよう水平反転する
    ctx.scale(flutter * (def.flipArt ? -1 : 1), 1)
    if (img) {
      // 敵イラストは種類によって縦横比がバラバラ(鎌鼬は横に長い等)なので、正方形に
      // 押し込んで引き伸ばすと潰れて小さく/貧弱に見える。長辺をsizeに合わせて
      // 縦横比を保ったまま描画する。
      const iw = img.naturalWidth || img.width
      const ih = img.naturalHeight || img.height
      const spriteScale = size / Math.max(iw, ih)
      const drawW = iw * spriteScale
      const drawH = ih * spriteScale
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    } else {
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(0, 0, def.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    if (e.hitFlash > 0) {
      // 被弾した瞬間だけ白く光らせる
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = `rgba(255,255,255,${Math.min(e.hitFlash / 0.22, 1)})`
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()

    // 減速中は足元に凍結エフェクト
    if (e.slowTimeLeft > 0) {
      const frostImg = getImage(ASSET_PATHS.effectIceFrost)
      if (frostImg) {
        drawImageCentered(ctx, frostImg, e.x, drawY + def.radius * 0.6, size * 1.1, size * 0.6)
      } else {
        ctx.strokeStyle = '#3fb0c2'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(e.x, drawY, def.radius + 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    if (!isEntering) {
      // 画面上端に近い敵はHPバーが枠の外へ切れてしまうので、入りきらない時は体の下側に出す
      const barW = def.radius * 3.2
      let barY = drawY - size / 2 - 5.5
      if (barY < 8) barY = Math.min(drawY + size / 2 + 6, FIELD.height - 8)
      const barX = Math.max(barW / 2 + 4, Math.min(FIELD.width - barW / 2 - 4, e.x))
      drawHpBar(ctx, barX, barY, barW, e.hp / e.maxHp)
      if (e.maxShield > 0 && e.shield > 0) {
        // シールド残量(HPバーの上に細い紫のバー)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(barX - barW / 2, barY - 8, barW, 3)
        ctx.fillStyle = '#9d7fe0'
        ctx.fillRect(barX - barW / 2, barY - 8, barW * (e.shield / e.maxShield), 3)
      }

      if (def.isBoss) {
        ctx.strokeStyle = '#f2c14e'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(e.x, drawY, size / 2 + 6 + Math.sin(animTime * 4) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
}

// 式神(小さな紙人形)。専用イラストが無い間は簡易な図形で描く
function drawMinions(ctx, minions, animTime) {
  const img = getImage(ASSET_PATHS.minionShiki)
  for (const m of minions) {
    const bob = Math.sin(animTime * 8 + m.id) * 2
    const fade = Math.min(1, m.life / 1.2)
    ctx.save()
    ctx.globalAlpha = fade
    ctx.translate(m.x, m.y + bob)
    ctx.scale(m.facing ?? 1, 1)
    if (img) {
      const iw = img.naturalWidth || img.width
      const ih = img.naturalHeight || img.height
      const s = 30 / Math.max(iw, ih)
      ctx.drawImage(img, -iw * s / 2, -ih * s / 2, iw * s, ih * s)
    } else {
      ctx.fillStyle = '#f2eef8'
      ctx.strokeStyle = '#5a6bb0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-8, 10)
      ctx.lineTo(-10, -8)
      ctx.lineTo(0, -14)
      ctx.lineTo(10, -8)
      ctx.lineTo(8, 10)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#5a6bb0'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('式', 0, 4)
    }
    ctx.restore()
    if (m.hp < m.maxHp) drawHpBar(ctx, m.x, m.y - 22, 20, m.hp / m.maxHp)
  }
}

function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    const def = OFUDA_TYPES[p.kind]
    if (p.kind === 'sniper') {
      // 破魔矢は向きを持つ矢のイラストで飛ばす(無い間は細い線で代用)
      const arrow = getImage(ASSET_PATHS.effectHamayaArrow)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle ?? 0)
      if (arrow) {
        const aw = 66
        ctx.drawImage(arrow, -aw / 2, (-aw * arrow.height) / arrow.width / 2, aw, (aw * arrow.height) / arrow.width)
      } else {
        ctx.strokeStyle = def.accent
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-22, 0)
        ctx.lineTo(22, 0)
        ctx.stroke()
      }
      ctx.restore()
      continue
    }
    const img = getImage(ASSET_PATHS.projectileOrb)
    if (img) {
      const tinted = getTinted(img, def.accent)
      drawImageCentered(ctx, tinted, p.x, p.y, 16, 16)
    } else {
      ctx.fillStyle = def.accent
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawFx(ctx, fx) {
  for (const f of fx) {
    const ratio = f.timeLeft / f.maxTime
    if (f.type === 'paper-shard') {
      // 撃破時に飛び散る小さな紙片(差分アニメの代わりのジューシーな演出)
      const baseImg = getImage(f.variant)
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rotation)
      ctx.globalAlpha = ratio
      if (baseImg) {
        const tinted = getTinted(baseImg, f.color || '#f0e6d2')
        ctx.drawImage(tinted, -8, -8, 16, 16)
      } else {
        ctx.fillStyle = f.color ? `${f.color}` : 'rgba(240,230,210,1)'
        ctx.fillRect(-3, -4, 6, 8)
      }
      ctx.globalAlpha = 1
      ctx.restore()
    } else if (f.type === 'explosion') {
      // 大筒の爆発: 広がる橙色の輪と、中心の光
      const grow = 1 - ratio
      const boomImg = getImage(ASSET_PATHS.effectCannonExplosion)
      if (boomImg) {
        const d = f.radius * 2 * (0.7 + grow * 0.35)
        ctx.globalAlpha = Math.min(1, ratio * 1.6)
        drawImageCentered(ctx, boomImg, f.x, f.y, d, d)
        ctx.globalAlpha = 1
        continue
      }
      ctx.save()
      ctx.globalAlpha = ratio * 0.55
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * (0.6 + grow * 0.4))
      g.addColorStop(0, '#fff2c0')
      g.addColorStop(0.5, '#e8823c')
      g.addColorStop(1, 'rgba(181,86,43,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.radius * (0.6 + grow * 0.4), 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = ratio
      ctx.strokeStyle = '#b5562b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.radius * (0.4 + grow * 0.6), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    } else if (f.type === 'sparkle') {
      // 小判が生まれた瞬間のきらめき
      const sparkleImg = getImage(ASSET_PATHS.effectKobanSparkle)
      if (sparkleImg) {
        ctx.globalAlpha = ratio
        drawImageCentered(ctx, sparkleImg, f.x, f.y - 10, 56 + (1 - ratio) * 14, 56 + (1 - ratio) * 14)
        ctx.globalAlpha = 1
      } else {
        ctx.strokeStyle = `rgba(242,193,78,${ratio})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(f.x, f.y - 10, 14 + (1 - ratio) * 16, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (f.type === 'lightning') {
      // 雷の連鎖: 2点間をジグザグにつなぐ(専用イラストがあれば、それを2点間に引き伸ばして使う)
      const boltImg = getImage(ASSET_PATHS.effectThunderBolt)
      if (boltImg) {
        const len = Math.hypot(f.x2 - f.x1, f.y2 - f.y1)
        ctx.save()
        ctx.globalAlpha = Math.min(1, ratio * 1.6)
        ctx.translate(f.x1, f.y1)
        ctx.rotate(Math.atan2(f.y2 - f.y1, f.x2 - f.x1))
        ctx.drawImage(boltImg, 0, -18, len, 36)
        ctx.restore()
        continue
      }
      ctx.save()
      ctx.globalAlpha = Math.min(1, ratio * 1.6)
      ctx.strokeStyle = '#fff6b0'
      ctx.shadowColor = '#d6b326'
      ctx.shadowBlur = 8
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(f.x1, f.y1)
      const segs = 4
      const nx = -(f.y2 - f.y1)
      const ny = f.x2 - f.x1
      const len = Math.hypot(nx, ny) || 1
      for (let i = 1; i < segs; i++) {
        const k = i / segs
        const off = (((i * 7 + Math.round(f.x1)) % 5) - 2) * 3
        ctx.lineTo(f.x1 + (f.x2 - f.x1) * k + (nx / len) * off, f.y1 + (f.y2 - f.y1) * k + (ny / len) * off)
      }
      ctx.lineTo(f.x2, f.y2)
      ctx.stroke()
      ctx.restore()
    } else if (f.type === 'card-break') {
      drawCardBreak(ctx, f, ratio)
    } else if (f.type === 'currency-popup') {
      // 通貨獲得を「+N」の文字で浮かび上がらせる
      ctx.save()
      ctx.globalAlpha = Math.min(ratio * 1.5, 1)
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f2c14e'
      ctx.strokeStyle = '#2c2418'
      ctx.lineWidth = 3
      ctx.strokeText(f.text, f.x, f.y)
      ctx.fillText(f.text, f.x, f.y)
      ctx.restore()
    } else if (f.type === 'boss-aoe') {
      const img = getImage(ASSET_PATHS.bossShockwave)
      if (img) {
        ctx.globalAlpha = ratio
        drawImageCentered(ctx, img, f.x, f.y, f.radius * 2 * (1 - ratio * 0.3), f.radius * 2 * (1 - ratio * 0.3))
        ctx.globalAlpha = 1
      } else {
        ctx.strokeStyle = `rgba(180,40,40,${ratio})`
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.radius * (1 - ratio) + 20, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (f.type === 'defeat-cutin') {
      // 中ボス・ボスは「気づいたら倒してた」となりがちなので、名前入りの撃破表示ではっきり
      // 見せる。ただし画面全体を覆う大きな演出だと大げさすぎるため、お札と同程度の大きさで
      // 倒した場所から浮かび上がるだけにする(通貨ポップアップの発展版)
      const elapsed = 1 - ratio
      const inRatio = Math.min(elapsed / 0.15, 1)
      const outRatio = Math.max((elapsed - 0.6) / 0.4, 0)
      const alpha = inRatio * (1 - outRatio)
      const rise = elapsed * 40
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = "bold 20px 'Yuji Syuku', serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = f.isBoss ? '#f2c14e' : '#e8823c'
      ctx.strokeStyle = 'rgba(10,5,5,0.85)'
      ctx.lineWidth = 3
      const text = `${f.name} 撃破!`
      ctx.strokeText(text, f.x, f.y - rise)
      ctx.fillText(text, f.x, f.y - rise)
      ctx.restore()
    } else if (f.type === 'boss-summon') {
      const img = getImage(ASSET_PATHS.bossSummon)
      if (img) {
        ctx.globalAlpha = ratio
        drawImageCentered(ctx, img, f.x, f.y, f.radius * 3, f.radius * 3)
        ctx.globalAlpha = 1
      } else {
        ctx.strokeStyle = `rgba(140,60,180,${ratio})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.radius * (1 - ratio) + 10, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
}

// お札が破壊された時、そのお札自身のカード絵を真っ二つに割って左右にずれ落とす演出
function drawCardBreak(ctx, f, ratio) {
  const img = getImage(ASSET_PATHS.ofudaCard[f.ofudaType])
  const slide = (1 - ratio) * 16
  const fall = (1 - ratio) * (1 - ratio) * 30
  const fade = ratio

  ctx.save()
  ctx.globalAlpha = fade
  if (img) {
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    // 左半分
    ctx.save()
    ctx.beginPath()
    ctx.rect(f.x - CARD_W / 2 - slide, f.y - CARD_H / 2 + fall, CARD_W / 2, CARD_H)
    ctx.clip()
    ctx.drawImage(img, 0, 0, iw / 2, ih, f.x - CARD_W / 2 - slide, f.y - CARD_H / 2 + fall, CARD_W / 2, CARD_H)
    ctx.restore()
    // 右半分
    ctx.save()
    ctx.beginPath()
    ctx.rect(f.x + slide, f.y - CARD_H / 2 - fall, CARD_W / 2, CARD_H)
    ctx.clip()
    ctx.drawImage(img, iw / 2, 0, iw / 2, ih, f.x + slide, f.y - CARD_H / 2 - fall, CARD_W / 2, CARD_H)
    ctx.restore()
  } else {
    ctx.fillStyle = '#f0e6d2'
    ctx.fillRect(f.x - CARD_W / 2 - slide, f.y - CARD_H / 2 + fall, CARD_W / 2 - 1, CARD_H)
    ctx.fillRect(f.x + 1 + slide, f.y - CARD_H / 2 - fall, CARD_W / 2 - 1, CARD_H)
  }
  ctx.restore()
}

// 何も操作していない時間帯(札を選んでいる間など)でも画面に動きがあるよう、
// 花びらが常に画面をゆっくり漂う演出。ミュータブルな状態を一切持たず、
// animTimeと個体ごとの固定シード値だけから毎フレーム位置を計算する(敵のbob演出と同じ考え方)。
const AMBIENT_PETAL_COUNT = 7

function drawAmbientPetals(ctx, animTime) {
  const img = getImage(ASSET_PATHS.decorPetal)
  if (!img) return
  const { width, height } = FIELD
  for (let i = 0; i < AMBIENT_PETAL_COUNT; i++) {
    const seed = i * 37.13
    const fallSpeed = 14 + (i % 4) * 6
    const driftAmp = 10 + (i % 3) * 6
    const size = 16 + (i % 3) * 5
    const spanY = height + 60
    const y = (((animTime * fallSpeed + seed * 23) % spanY) + spanY) % spanY - 30
    const baseX = width * ((seed * 0.618) % 1)
    const x = (baseX + Math.sin(animTime * 0.6 + seed) * driftAmp + width) % width
    const rotation = animTime * (0.4 + (i % 3) * 0.15) + seed
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
    ctx.restore()
  }
}

// ラスボス(荒魂)戦だけ、雰囲気を出すため画面に雨を降らせる。花びら演出と同じく
// ミュータブルな状態を持たず、animTime+個体シードだけで毎フレーム位置を計算する。
const RAIN_COUNT = 46

function drawBossRain(ctx, animTime) {
  const { width, height } = FIELD
  ctx.save()
  ctx.fillStyle = 'rgba(20, 24, 40, 0.14)'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(190, 205, 225, 0.4)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < RAIN_COUNT; i++) {
    const seed = i * 91.7
    const speed = 420 + (i % 5) * 60
    const len = 14 + (i % 3) * 7
    const spanY = height + len
    const y = (((animTime * speed + seed * 13) % spanY) + spanY) % spanY - len
    const x = (width * ((seed * 0.382) % 1) + width) % width
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - len * 0.28, y + len)
    ctx.stroke()
  }
  ctx.restore()
}

function draw(ctx, state, animTime, showRanges, hoverPos, previewTypeId) {
  const { width, height } = FIELD
  ctx.clearRect(0, 0, width, height)
  ctx.save()

  const shake = state.screenShake
  if (shake && shake.timeLeft > 0) {
    const power = shake.magnitude * (shake.timeLeft / 0.35)
    ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power)
  }

  drawField(ctx, state.turn, state.chapter)
  if (showRanges) drawTowerRanges(ctx, state.towers)
  drawTowers(ctx, state.towers, animTime)
  if (previewTypeId) drawPlacementPreview(ctx, hoverPos, previewTypeId)

  // ボス登場中は、ボス自身を除く画面全体を一瞬暗くして溜めを作る
  // (敵の描画より前に暗転させ、ボスは常に明るいまま最前面へ描く)
  const enteringBoss = state.enemies.find((e) => e.entranceTimeLeft > 0)
  if (enteringBoss) {
    const ratio = enteringBoss.entranceTimeLeft / BOSS_ENTRANCE_SECONDS
    ctx.fillStyle = `rgba(10, 5, 10, ${ratio * 0.55})`
    ctx.fillRect(0, 0, width, height)
  }

  drawEnemies(ctx, state.enemies, animTime)
  drawMinions(ctx, state.minions ?? [], animTime)
  drawProjectiles(ctx, state.projectiles)
  drawFx(ctx, state.fx)
  drawAmbientPetals(ctx, animTime)
  // ラスボス(荒魂)戦の間だけ雨を降らせて、決戦の空気を出す
  if (state.enemies.some((e) => ENEMY_TYPES[e.type].isBoss)) drawBossRain(ctx, animTime)
  ctx.restore()
}

export default function GameCanvas({ runStateRef, active, onCanvasClick, skillEffects, onFrame, previewTypeId, speed = 1 }) {
  const canvasRef = useRef(null)
  const hoverPosRef = useRef(null)
  const previewTypeRef = useRef(previewTypeId)
  previewTypeRef.current = previewTypeId
  const speedRef = useRef(speed)
  speedRef.current = speed

  // 効果音は「前フレームと比べて何が新しく起きたか」を検知して鳴らす(エンジン側を
  // 音無しの純粋なシミュレーションに保つため)。タワー/敵はidごとに前回値を覚えておく。
  const prevKillsRef = useRef(0)
  const prevFireFlashRef = useRef(new Map())
  const prevHitFlashRef = useRef(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let lastTime = performance.now()
    let animTime = 0
    let raf

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      animTime += dt

      if (active) {
        // 早送り: 同じdtでstepを複数回まわし、体感速度を上げる(値を大きくして
        // 1回のstepを粗くするとコリジョン等がズレるため、あえて回数を増やす方式)
        for (let i = 0; i < speedRef.current; i++) {
          step(runStateRef.current, dt, skillEffects)
        }

        const state = runStateRef.current
        for (const t of state.towers) {
          const prev = prevFireFlashRef.current.get(t.id) ?? 0
          if (t.fireFlash > prev) playLaunch(t.type)
          prevFireFlashRef.current.set(t.id, t.fireFlash)
        }
        for (const e of state.enemies) {
          const prev = prevHitFlashRef.current.get(e.id) ?? 0
          if (e.hitFlash > prev) playHit()
          prevHitFlashRef.current.set(e.id, e.hitFlash)
        }
        if (state.kills > prevKillsRef.current) {
          // 直前にボス級を倒した(=defeat-cutinが今まさに発火した)かどうかで音の重さを変える
          const justDefeatedBig = state.fx.some((f) => f.type === 'defeat-cutin' && f.timeLeft >= f.maxTime - 0.001)
          playEnemyDeath(justDefeatedBig)
          prevKillsRef.current = state.kills
        }
      }
      draw(ctx, runStateRef.current, animTime, !active, hoverPosRef.current, previewTypeRef.current)
      if (onFrame) onFrame(runStateRef.current)

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skillEffects])

  const toFieldCoords = (ev) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = FIELD.width / rect.width
    const scaleY = FIELD.height / rect.height
    return { x: (ev.clientX - rect.left) * scaleX, y: (ev.clientY - rect.top) * scaleY }
  }

  const handleClick = (ev) => {
    if (!onCanvasClick) return
    const { x, y } = toFieldCoords(ev)
    onCanvasClick(x, y)
  }

  const handleMouseMove = (ev) => {
    hoverPosRef.current = toFieldCoords(ev)
  }

  const handleMouseLeave = () => {
    hoverPosRef.current = null
  }

  // カードをフィールドへ直接ドラッグ&ドロップして配置できるようにする
  // (クリックで選んでからクリックで置く、の2手順を1手順に短縮する高速な配置手段)
  const handleDragOver = (ev) => {
    if (!onCanvasClick) return
    ev.preventDefault()
    hoverPosRef.current = toFieldCoords(ev)
  }

  const handleDrop = (ev) => {
    if (!onCanvasClick) return
    ev.preventDefault()
    const { x, y } = toFieldCoords(ev)
    onCanvasClick(x, y)
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1100 / 666' }}>
      <canvas
        ref={canvasRef}
        width={FIELD.width}
        height={FIELD.height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ cursor: onCanvasClick ? 'crosshair' : 'default', display: 'block', position: 'absolute', left: 'calc(9.636% - 3px)', top: 'calc(15.616% - 3px)', width: 'calc(80.727% + 6px)', height: 'calc(71.471% + 6px)' }}
      />
      {/* 額縁をcanvasのCSS border(=和紙の外側に隣接するだけ)ではなく、和紙より上のレイヤーに
          重ねて描く。境界のサブピクセルのズレで隙間が見えることがなくなり、和紙の縁を
          額縁が確実に覆い隠す形になる */}
      <div className="ofuda-field-frame" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  )
}
