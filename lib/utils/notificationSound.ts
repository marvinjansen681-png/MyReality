// A short two-tone chime synthesized with the Web Audio API — no audio
// asset to source/host/commit, and it always matches the app's own volume/
// mute expectations (nothing loops, nothing autoplays before a user has
// interacted with the page at all, which is when browsers block audio
// anyway — by the time a notification can arrive the user is already
// signed in and has clicked something).
let audioCtx: AudioContext | null = null

export function playNotificationSound() {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const now = audioCtx.currentTime
    const tones = [{ freq: 880, start: 0 }, { freq: 1108.73, start: 0.09 }]

    for (const tone of tones) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = tone.freq
      gain.gain.setValueAtTime(0, now + tone.start)
      gain.gain.linearRampToValueAtTime(0.15, now + tone.start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + 0.22)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(now + tone.start)
      osc.stop(now + tone.start + 0.24)
    }
  } catch {
    // Audio is a nice-to-have; never let it break notification delivery.
  }
}
