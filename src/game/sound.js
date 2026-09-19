// 効果音は音声ファイルを使わず、Web Audio APIでその場で合成する。
// (アセット追加なしで「長押しでどんどん音が高くなる」を実現できるため)
let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}


// ---- マスターバス ----
// 全ての音を「コンプレッサー(重なっても割れない)→ マスター音量」へ通し、さらに
// 一部を短いリバーブ(神社の境内のような残響)へ送る。単体で鳴らすと素っ気ない合成音でも、
// 同じ空間で鳴っているように聞こえて一気に安っぽさが減る。
let busIn = null
let masterGain = null
let muted = false
try {
  muted = localStorage.getItem('ofuda-td-muted') === '1'
} catch {
  // localStorageが使えなくても致命的ではない
}

function makeImpulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      // 高域ほど早く消える指数減衰のノイズ(木造の建物のこもった残響に寄せる)
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (0.6 + 0.4 * (1 - t))
    }
  }
  return impulse
}

function getBus() {
  const ctx = getCtx()
  if (busIn) return busIn
  busIn = ctx.createGain()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 18
  comp.ratio.value = 5
  comp.attack.value = 0.004
  comp.release.value = 0.18
  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : 0.9

  const reverb = ctx.createConvolver()
  reverb.buffer = makeImpulse(ctx, 1.5, 3.2)
  const reverbTone = ctx.createBiquadFilter()
  reverbTone.type = 'lowpass'
  reverbTone.frequency.value = 3200
  const wet = ctx.createGain()
  wet.gain.value = 0.22

  busIn.connect(comp)
  busIn.connect(reverb)
  reverb.connect(reverbTone)
  reverbTone.connect(wet)
  wet.connect(comp)
  comp.connect(masterGain)
  masterGain.connect(ctx.destination)
  return busIn
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem('ofuda-td-muted', value ? '1' : '0')
  } catch {
    // 保存できなくても、その場のミュートは有効
  }
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.9
}

// 同じ音が1フレームに何十個も重なる(早送り時など)と割れて聞こえるので、種類ごとに最短間隔を設ける
const lastPlayed = new Map()
function throttled(key, minMs) {
  const now = performance.now()
  if (now - (lastPlayed.get(key) ?? -1e9) < minMs) return true
  lastPlayed.set(key, now)
  return false
}

let chargeOsc = null
let chargeGain = null

const CHARGE_FREQ_START = 220
const CHARGE_FREQ_END = 880

// 長押し開始: 低いサイン波をフェードインさせながら鳴らし始める
export function startCharge() {
  stopCharge(false)
  const ctx = getCtx()
  chargeOsc = ctx.createOscillator()
  chargeGain = ctx.createGain()
  chargeOsc.type = 'sine'
  chargeOsc.frequency.setValueAtTime(CHARGE_FREQ_START, ctx.currentTime)
  chargeGain.gain.setValueAtTime(0, ctx.currentTime)
  chargeGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05)
  chargeOsc.connect(chargeGain)
  chargeGain.connect(getBus())
  chargeOsc.start()
}

// 長押し中: progress(0〜1)に応じて音程を上げていく
export function updateCharge(progress) {
  if (!chargeOsc) return
  const ctx = getCtx()
  const freq = CHARGE_FREQ_START + progress * (CHARGE_FREQ_END - CHARGE_FREQ_START)
  chargeOsc.frequency.setValueAtTime(freq, ctx.currentTime)
}

// 長押し終了: 音を止める。playConfirm=trueなら達成音を続けて鳴らす
export function stopCharge(playConfirm) {
  if (chargeOsc) {
    const ctx = getCtx()
    chargeGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
    chargeOsc.stop(ctx.currentTime + 0.1)
    chargeOsc = null
    chargeGain = null
  }
  if (playConfirm) playConfirmChime()
}

// ノイズバッファ(白色雑音)は毎回作ると重いので使い回す。「紙」の質感(擦れる/破れる/潰れる)を
// フィルターで作るのに使う。単純なオシレーター単体の音は安っぽく聞こえがちなため、
// 「低音のサイン波(衝撃)」+「フィルター済みノイズ(質感)」を重ねる、ピッチを毎回わずかに
// ランダムにずらす、を基本方針にしている。
let noiseBuffer = null
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer
  const size = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}
function createNoiseSource(ctx) {
  const src = ctx.createBufferSource()
  src.buffer = getNoiseBuffer(ctx)
  return src
}

// お札の種類ごとに発射音の質感(フィルター周波数)を変える
const LAUNCH_PROFILES = {
  fire: { freq: 1800, q: 6 },
  earth: { freq: 500, q: 3 },
  wind: { freq: 2600, q: 4 },
  ice: { freq: 3200, q: 8 },
  support: { freq: 1200, q: 5 },
  basic: { freq: 2000, q: 5 },
  cannon: { freq: 260, q: 1.5 },
  sniper: { freq: 3400, q: 9 },
  poison: { freq: 900, q: 2 },
  thunder: { freq: 4200, q: 2 },
  curse: { freq: 450, q: 4 },
  koban: { freq: 5200, q: 12 },
  shiki: { freq: 1500, q: 3 },
}

// お札の発射音: フィルター済みノイズの短いバースト。属性ごとに周波数を変える。
// 琴・三味線を弾いたような撥弦音。鋸波を、時間とともに閉じていくローパスに通すと、
// 弾いた瞬間が明るく、余韻が丸くなる「弦らしい」減衰になる。
function playPluck(freq, startTime, duration = 0.5, peak = 0.2) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc2.type = 'triangle'
  osc.frequency.setValueAtTime(freq, startTime)
  osc2.frequency.setValueAtTime(freq * 2.003, startTime)
  filter.type = 'lowpass'
  filter.Q.value = 3
  filter.frequency.setValueAtTime(freq * 9, startTime)
  filter.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + duration * 0.8)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.connect(filter)
  osc2.connect(filter)
  filter.connect(gain)
  gain.connect(getBus())
  osc.start(startTime)
  osc2.start(startTime)
  osc.stop(startTime + duration + 0.05)
  osc2.stop(startTime + duration + 0.05)
}

function noiseBurst(ctx, t, dur, type, freq, q, peak) {
  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(freq, t)
  filter.Q.value = q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(getBus())
  noise.start(t)
  noise.stop(t + dur + 0.02)
  return filter
}

function tone(ctx, t, type, f0, f1, dur, peak) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(getBus())
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

// 応用編の札は、それぞれ専用の発射音を持たせる(基本の札の使い回しだと単調になるため)
const CUSTOM_LAUNCH = {
  // 大筒: 腹に響く「ドン」+ 火薬の破裂
  cannon(ctx, t) {
    tone(ctx, t, 'sine', 120, 38, 0.35, 0.5)
    noiseBurst(ctx, t, 0.25, 'lowpass', 1600, 1, 0.35)
  },
  // 破魔矢: 弓弦の「ビィン」+ 風を切る音
  sniper(ctx, t) {
    tone(ctx, t, 'triangle', 520, 380, 0.22, 0.2)
    const f = noiseBurst(ctx, t, 0.16, 'bandpass', 1800, 2, 0.16)
    f.frequency.exponentialRampToValueAtTime(5200, t + 0.16)
  },
  // 毒: ぽこぽこと泡立つ音
  poison(ctx, t) {
    tone(ctx, t, 'sine', 280, 620, 0.09, 0.22)
    tone(ctx, t + 0.07, 'sine', 360, 760, 0.08, 0.16)
  },
  // 雷: 高域のパチパチ + 低いうなり
  thunder(ctx, t) {
    for (let i = 0; i < 4; i++) noiseBurst(ctx, t + i * 0.025 + Math.random() * 0.01, 0.03, 'highpass', 3500 + Math.random() * 3000, 1, 0.22)
    tone(ctx, t, 'sawtooth', 90, 55, 0.22, 0.1)
  },
  // 呪: 低くゆらぐ不気味な二重の音
  curse(ctx, t) {
    tone(ctx, t, 'sine', 196, 170, 0.4, 0.16)
    tone(ctx, t, 'sine', 203, 176, 0.4, 0.14)
  },
  // 小判: チャリン(金属の倍音を2つ重ねた短い響き)
  koban(ctx, t) {
    ;[2637, 3520, 5230].forEach((f, i) => tone(ctx, t + i * 0.012, 'sine', f, f * 0.995, 0.28 - i * 0.05, 0.13 / (i + 1)))
  },
  // 式神: 紙の擦れる音 + 小さな木のコツ
  shiki(ctx, t) {
    noiseBurst(ctx, t, 0.12, 'bandpass', 2400, 1.5, 0.14)
    tone(ctx, t + 0.02, 'triangle', 780, 420, 0.08, 0.16)
  },
  // 祓: 神楽鈴のようなシャラシャラという細かい金属音
  harai(ctx, t) {
    for (let i = 0; i < 5; i++) tone(ctx, t + i * 0.022, 'sine', 3000 + Math.random() * 1600, 2600, 0.14, 0.07)
  },
}

export function playLaunch(kindId) {
  if (throttled(`launch-${kindId}`, 35)) return
  const ctx = getCtx()
  const now = ctx.currentTime
  if (CUSTOM_LAUNCH[kindId]) {
    CUSTOM_LAUNCH[kindId](ctx, now)
    return
  }
  const profile = LAUNCH_PROFILES[kindId] ?? LAUNCH_PROFILES.basic
  const jitter = 0.95 + Math.random() * 0.1 // 毎回わずかにピッチをずらし、量産感を消す

  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(profile.freq * jitter, now)
  filter.Q.value = profile.q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(getBus())
  noise.start(now)
  noise.stop(now + 0.1)
}

// 被弾音: 低音の「ドスッ」(ピッチが急降下するサイン波)+ 紙が弾ける高音のノイズを重ねる
export function playHit() {
  if (throttled('hit', 30)) return
  const ctx = getCtx()
  const now = ctx.currentTime
  const jitter = 0.9 + Math.random() * 0.2

  const thumpOsc = ctx.createOscillator()
  const thumpGain = ctx.createGain()
  thumpOsc.type = 'sine'
  thumpOsc.frequency.setValueAtTime(160 * jitter, now)
  thumpOsc.frequency.exponentialRampToValueAtTime(50 * jitter, now + 0.09)
  thumpGain.gain.setValueAtTime(0.26, now)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  thumpOsc.connect(thumpGain)
  thumpGain.connect(getBus())
  thumpOsc.start(now)
  thumpOsc.stop(now + 0.11)

  // 「電子音っぽい」との指摘を受け、無制限に高域まで抜けるhighpassではなく
  // 帯域を絞ったbandpassにして、耳に痛いホワイトノイズ感を抑える
  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(3200 * jitter, now)
  filter.Q.value = 1.2
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.14, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(getBus())
  noise.start(now)
  noise.stop(now + 0.05)
}

// 撃破音: 紙がクシャッと潰れるイメージのノイズ(ローパスフィルターが急速に下がるスイープ)。
// ボス級(isBig)は長め・低めにし、重い一撃音も重ねる。
export function playEnemyDeath(isBig = false) {
  if (!isBig && throttled('death', 45)) return
  const ctx = getCtx()
  const now = ctx.currentTime
  const dur = isBig ? 0.35 : 0.18
  const jitter = 0.92 + Math.random() * 0.16

  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime((isBig ? 3000 : 4000) * jitter, now)
  filter.frequency.exponentialRampToValueAtTime(200 * jitter, now + dur)
  filter.Q.value = 2
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(isBig ? 0.32 : 0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(getBus())
  noise.start(now)
  noise.stop(now + dur + 0.02)

  if (isBig) {
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(90, now)
    thud.frequency.exponentialRampToValueAtTime(35, now + 0.3)
    thudGain.gain.setValueAtTime(0.3, now)
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
    thud.connect(thudGain)
    thudGain.connect(getBus())
    thud.start(now)
    thud.stop(now + 0.33)
  }
}

// 太鼓の一打: 胴の共鳴(低音のサイン波、ピッチが素早く落ちる)+ 皮を打つ瞬間のアタック
// (フィルター済みノイズ)を重ねる。
function playTaikoHit(startTime, power) {
  const ctx = getCtx()
  const jitter = 0.95 + Math.random() * 0.1

  const body = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  body.type = 'sine'
  body.frequency.setValueAtTime(130 * jitter, startTime)
  body.frequency.exponentialRampToValueAtTime(45 * jitter, startTime + 0.22)
  bodyGain.gain.setValueAtTime(0.45 * power, startTime)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
  body.connect(bodyGain)
  bodyGain.connect(getBus())
  body.start(startTime)
  body.stop(startTime + 0.42)

  const noise = createNoiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1400, startTime)
  filter.frequency.exponentialRampToValueAtTime(250, startTime + 0.15)
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.35 * power, startTime)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(getBus())
  noise.start(startTime)
  noise.stop(startTime + 0.13)
}

// 太鼓の音: 一打だけだと単発の「ドン」で物足りないため、「ドドン」という前打ち+本打ちの
// 2打構成にする(本打ちの方を強く)。ターン開始や、鐘の演出の土台にも使う。
export function playTaiko(power = 1) {
  const ctx = getCtx()
  const now = ctx.currentTime
  playTaikoHit(now, power * 0.6)
  playTaikoHit(now + 0.11, power)
}

// 鐘のような音: 純粋なサイン波1本だと電子音っぽく聞こえるため、倍音を少しずらした
// 複数のサイン波を重ねて(単純な整数倍にしない)、鐘特有のうなり・金属的な響きを作る。
function playBellTone(freq, startTime, duration, gainPeak) {
  const ctx = getCtx()
  ;[1, 2.01, 2.76, 4.07].forEach((mult, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * mult, startTime)
    const peak = gainPeak / (i + 1)
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(getBus())
    osc.start(startTime)
    osc.stop(startTime + duration + 0.05)
  })
}

// ターン内の1ウェーブをクリアした時の合図(周回全体のクリアより軽めの太鼓+鐘)。
// 以前はplayConfirmChime(三角波のピコピコ音)を流用していたが電子音っぽいとの指摘を受け、
// 他の場面と同じ太鼓+鐘の音色に統一した。
export function playTurnClear() {
  const ctx = getCtx()
  const now = ctx.currentTime
  playTaiko(0.5)
  playBellTone(1046.5, now + 0.05, 0.35, 0.16)
}

// ウェーブクリア時: 太鼓の一打+鈴を思わせる鐘の響き(完全五度上を少し遅れて重ねる)。
// 西洋的な上昇アルペジオだと「ゲームのジングル」感が強く出るため、和風の打楽器主体にした。
export function playWaveClear() {
  const ctx = getCtx()
  const now = ctx.currentTime
  playTaiko(0.8)
  playBellTone(880, now + 0.05, 0.6, 0.18)
  playBellTone(1318.5, now + 0.16, 0.6, 0.14)
}

// 敗北時: 控えめな太鼓の一打+低く沈む鐘の音1つだけ、ゆっくり余韻を残す
export function playDefeat() {
  const ctx = getCtx()
  const now = ctx.currentTime
  playTaiko(0.6)
  playBellTone(220, now + 0.05, 1.1, 0.16)
}

// 解放達成時: 琴を弾いたような上行の2音(五音音階)+ 鐘の余韻
export function playConfirmChime() {
  const ctx = getCtx()
  const now = ctx.currentTime
  playPluck(587.3, now, 0.55, 0.2)
  playPluck(880, now + 0.09, 0.7, 0.2)
  playBellTone(1174.7, now + 0.1, 0.6, 0.06)
}

// 宝珠を選んだ時: 澄んだ鐘の重なり + きらめく高音の撥弦
export function playRelicGet() {
  const ctx = getCtx()
  const now = ctx.currentTime
  playTaiko(0.55)
  playBellTone(659.3, now + 0.05, 1.2, 0.2)
  playBellTone(987.8, now + 0.18, 1.2, 0.16)
  ;[1318.5, 1568, 1976].forEach((f, i) => playPluck(f, now + 0.3 + i * 0.07, 0.6, 0.1))
}
