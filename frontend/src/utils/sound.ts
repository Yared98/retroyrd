/**
 * Utilitário de Alerta Sonoro usando Web Audio API nativa
 * Não depende de arquivos externos (.mp3/.wav), funcionando 100% offline.
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private activeTimeouts: number[] = [];

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
   * Toca um pulso de sino harmônico com ataque acústico limpo e presença
   */
  private playPulse(freqBase: number = 880, volume: number = 0.28) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Harmônicos enriquecidos de sino: fundamental + terça + oitava
      const harmonics = [
        { freq: freqBase, gainRatio: 1.0, type: 'sine' as OscillatorType },
        { freq: freqBase * 1.2599, gainRatio: 0.45, type: 'sine' as OscillatorType },
        { freq: freqBase * 2.0, gainRatio: 0.3, type: 'triangle' as OscillatorType },
      ];

      harmonics.forEach(({ freq, gainRatio, type }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        const peakGain = volume * gainRatio;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      });
    } catch (err) {
      console.warn('Não foi possível tocar áudio de alerta:', err);
    }
  }

  /**
   * Toca o alarme repetindo 5 vezes para chamar a atenção do usuário.
   * Utiliza um padrão melódico alegre e ritmado de campainha/sino.
   * @param repetitions Quantidade de repetições (padrão: 5)
   * @param intervalMs Intervalo entre repetições em milissegundos (padrão: 520ms)
   */
  public playAlarm(repetitions: number = 5, intervalMs: number = 520) {
    if (this.isMuted) return;
    this.stop();

    // Sequência melódica amigável e perceptível (A5 -> C#6 -> A5 -> C#6 -> E6)
    const melody = [880.0, 1108.73, 880.0, 1108.73, 1318.51];

    for (let i = 0; i < repetitions; i++) {
      const timeoutId = window.setTimeout(() => {
        const freq = melody[i % melody.length];
        const vol = i === repetitions - 1 ? 0.32 : 0.26;
        this.playPulse(freq, vol);
      }, i * intervalMs);
      this.activeTimeouts.push(timeoutId);
    }
  }

  /**
   * Interrompe qualquer repetição pendente
   */
  public stop() {
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeTimeouts = [];
  }

  /**
   * Toca um chime de sino (repete 5 vezes por padrão para garantir atenção)
   */
  public playChime(repetitions: number = 5) {
    this.playAlarm(repetitions);
  }
}

export const soundPlayer = new SoundPlayer();
