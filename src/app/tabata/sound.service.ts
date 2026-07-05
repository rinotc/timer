import { Injectable, signal } from '@angular/core';

/**
 * Web Audio API を使ってビープ音を再生するサービス。
 * 外部音源ファイルに依存せず、フロントエンドのみで完結する。
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  /** 音を鳴らすかどうか(ユーザーが切り替え可能) */
  readonly enabled = signal(true);

  private audioContext: AudioContext | null = null;

  toggleEnabled(): void {
    this.enabled.update((value) => !value);
  }

  /**
   * ユーザー操作(スタートボタン押下など)を契機に AudioContext を初期化する。
   * ブラウザの自動再生ポリシー対策。
   */
  unlock(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  /** セット(ワーク)開始時の音: 高めの音を1回 */
  playSetStart(): void {
    this.beep([{ frequency: 880, duration: 0.35, offset: 0 }]);
  }

  /** セット(ワーク)終了時の音: 低めの音を2回 */
  playSetEnd(): void {
    this.beep([
      { frequency: 440, duration: 0.2, offset: 0 },
      { frequency: 440, duration: 0.2, offset: 0.3 },
    ]);
  }

  /** カウントダウン(残り3秒)の音: 短い音を1回 */
  playCountdown(): void {
    this.beep([{ frequency: 660, duration: 0.12, offset: 0 }]);
  }

  /** 全セット完了時の音: 上昇する3音 */
  playFinish(): void {
    this.beep([
      { frequency: 523.25, duration: 0.2, offset: 0 },
      { frequency: 659.25, duration: 0.2, offset: 0.25 },
      { frequency: 783.99, duration: 0.4, offset: 0.5 },
    ]);
  }

  private beep(notes: { frequency: number; duration: number; offset: number }[]): void {
    if (!this.enabled()) {
      return;
    }
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    for (const note of notes) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const startAt = ctx.currentTime + note.offset;
      const stopAt = startAt + note.duration;
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.3, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt);
    }
  }

  private getContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    this.audioContext = new AudioContext();
    return this.audioContext;
  }
}
