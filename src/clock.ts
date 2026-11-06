/** Глобальные часы симуляции: скорость в сим-секундах за реальную секунду. */
export class SimClock {
  private simMs = Date.now();
  private last = performance.now();
  rate = 1;
  paused = false;

  get date() { return new Date(this.simMs); }

  tick() {
    const now = performance.now();
    if (!this.paused) this.simMs += (now - this.last) * this.rate;
    this.last = now;
  }
  setRate(r: number) { this.rate = r; this.paused = false; }
  setTime(ms: number) { this.simMs = ms; }
  togglePause() { this.paused = !this.paused; }
  goLive() { this.simMs = Date.now(); this.rate = 1; this.paused = false; }
  isLive() { return !this.paused && this.rate === 1 && Math.abs(this.simMs - Date.now()) < 5000; }

  describe() {
    if (this.paused) return 'ПАУЗА';
    if (this.isLive()) return 'LIVE';
    const r = Math.abs(this.rate), sign = this.rate < 0 ? '−' : '';
    const units: [number, string][] = [[31557600, 'год'], [2629800, 'мес'], [86400, 'день'], [3600, 'час'], [60, 'мин'], [1, 'сек']];
    const [v, n] = units.find(([u]) => r >= u) ?? [1, 'сек'];
    return `${sign}${+(r / v).toFixed(1)} ${n}/с`;
  }
}
