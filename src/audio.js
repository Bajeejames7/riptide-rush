export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.voices = [];
    this.nextNote = 0;
    this.note = 0;
  }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.engine = this.ctx.createGain();
      this.engine.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.connect(this.master);
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator(),
          gain = this.ctx.createGain(),
          filter = this.ctx.createBiquadFilter();
        osc.type = "sawtooth";
        filter.type = "lowpass";
        filter.frequency.value = 400;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.engine);
        gain.gain.value = 0;
        osc.start();
        this.voices.push({ osc, gain, filter });
      }
    }
    this.ctx.resume();
  }
  tone(freq, duration = 0.15, type = "sine", volume = 0.12, bus) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq * 0.55),
      t + duration,
    );
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(bus || this.master);
    o.start();
    o.stop(t + duration);
  }
  noise(duration = 0.3, volume = 0.16) {
    if (!this.ctx) return;
    const buffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * duration,
        this.ctx.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.ctx.createBufferSource(),
      g = this.ctx.createGain();
    source.buffer = buffer;
    g.gain.value = volume * this.settings.sfx;
    source.connect(g);
    g.connect(this.master);
    source.start();
  }
  event(name) {
    if (name === "pickup") {
      this.tone(880, 0.12, "sine", 0.12 * this.settings.sfx);
      setTimeout(
        () => this.tone(1320, 0.15, "sine", 0.1 * this.settings.sfx),
        70,
      );
    } else if (name === "land" || name === "bump") this.noise(0.28, 0.2);
    else if (name === "lap")
      this.tone(660, 0.5, "triangle", 0.15 * this.settings.sfx);
    else
      this.tone(
        name === "go" ? 990 : 440,
        0.14,
        "square",
        0.08 * this.settings.sfx,
      );
  }
  update(boats, theme, active) {
    if (!this.ctx) return;
    this.master.gain.value = this.settings.master;
    this.engine.gain.value = this.settings.sfx;
    this.music.gain.value = this.settings.music;
    this.voices.forEach((v, i) => {
      const b = boats[i];
      v.gain.gain.setTargetAtTime(
        active && b?.speed ? 0.022 + (b.boosting ? 0.025 : 0) : 0,
        this.ctx.currentTime,
        0.1,
      );
      v.osc.frequency.setTargetAtTime(
        38 + Math.abs(b?.speed || 0) * 2.9,
        this.ctx.currentTime,
        0.05,
      );
      v.filter.frequency.value = 200 + Math.abs(b?.speed || 0) * 12;
    });
    const t = this.ctx.currentTime;
    if (active && boats.some((b) => b.boosting) && t > (this.nextRoar || 0)) {
      this.noise(0.2, 0.04);
      this.nextRoar = t + 0.15;
    }
    if (t > this.nextNote) {
      this.nextNote = t + 0.22;
      const roots =
        theme === "ice"
          ? [45, 48, 52, 55]
          : theme === "city"
            ? [40, 43, 47, 50]
            : [48, 52, 55, 59];
      const n =
        roots[Math.floor(this.note / 8) % 4] +
        [0, 12, 7, 12, 0, 7, 15, 12][this.note % 8];
      this.tone(
        440 * 2 ** ((n - 69) / 12),
        0.35,
        "triangle",
        0.055,
        this.music,
      );
      if (this.note % 4 === 0) this.tone(75, 0.16, "sine", 0.08, this.music);
      this.note++;
    }
  }
}
