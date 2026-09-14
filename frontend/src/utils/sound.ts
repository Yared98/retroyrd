/**
 * Utilitário de Alerta Sonoro usando Web Audio API nativa
 * Não depende de arquivos externos (.mp3/.wav), funcionando 100% offline.
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Toca um chime de sino suave e audível quando o timer conclui
   */
  public playChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Tríade harmônica E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
      const frequencies = [659.25, 830.61, 987.77, 1318.51];

      frequencies.forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        // Envelope suave com ataque rápido e decaimento gradual tipo sino
        const startTime = now + index * 0.08;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.6);
      });
    } catch (err) {
      console.warn('Não foi possível tocar áudio de alerta:', err);
    }
  }
}

export const soundPlayer = new SoundPlayer();
