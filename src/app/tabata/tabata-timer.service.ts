import { computed, inject, Injectable, signal } from '@angular/core';
import { SoundService } from './sound.service';
import { WakeLockService } from './wake-lock.service';

export type TabataPhase = 'idle' | 'prepare' | 'work' | 'rest' | 'finished';

export interface TabataSettings {
  /** 開始前の準備時間(秒) */
  prepareSeconds: number;
  /** ワーク(運動)時間(秒) */
  workSeconds: number;
  /** 休憩時間(秒) */
  restSeconds: number;
  /** セット数 */
  totalSets: number;
}

export const DEFAULT_TABATA_SETTINGS: TabataSettings = {
  prepareSeconds: 10,
  workSeconds: 20,
  restSeconds: 10,
  totalSets: 8,
};

/**
 * 田畑式(タバタ式)タイマーの状態管理サービス。
 * 準備 → (ワーク → 休憩) × セット数 → 完了 の流れを管理し、
 * セット開始・終了時に音を鳴らす。
 */
@Injectable({ providedIn: 'root' })
export class TabataTimerService {
  private readonly sound = inject(SoundService);
  private readonly wakeLock = inject(WakeLockService);

  readonly settings = signal<TabataSettings>({ ...DEFAULT_TABATA_SETTINGS });

  readonly phase = signal<TabataPhase>('idle');
  readonly remainingSeconds = signal(0);
  readonly currentSet = signal(0);
  readonly isRunning = signal(false);

  readonly isIdle = computed(() => this.phase() === 'idle');
  readonly isFinished = computed(() => this.phase() === 'finished');
  readonly isActive = computed(() => !this.isIdle() && !this.isFinished());

  private intervalId: ReturnType<typeof setInterval> | null = null;

  updateSettings(settings: Partial<TabataSettings>): void {
    if (this.isActive()) {
      return;
    }
    this.settings.update((current) => ({ ...current, ...settings }));
  }

  /** タイマーを最初から開始する */
  start(): void {
    if (this.isActive()) {
      return;
    }
    this.sound.unlock();
    this.currentSet.set(0);
    const prepare = this.settings().prepareSeconds;
    if (prepare > 0) {
      this.phase.set('prepare');
      this.remainingSeconds.set(prepare);
    } else {
      this.startWork();
    }
    this.isRunning.set(true);
    void this.wakeLock.engage();
    this.startTicking();
  }

  pause(): void {
    if (!this.isActive() || !this.isRunning()) {
      return;
    }
    this.isRunning.set(false);
    void this.wakeLock.release();
    this.stopTicking();
  }

  resume(): void {
    if (!this.isActive() || this.isRunning()) {
      return;
    }
    this.sound.unlock();
    this.isRunning.set(true);
    void this.wakeLock.engage();
    this.startTicking();
  }

  reset(): void {
    this.stopTicking();
    this.phase.set('idle');
    this.remainingSeconds.set(0);
    this.currentSet.set(0);
    this.isRunning.set(false);
    void this.wakeLock.release();
  }

  /** 1秒経過ごとの処理(テストからも直接呼び出せるよう public) */
  tick(): void {
    if (!this.isActive()) {
      return;
    }
    const remaining = this.remainingSeconds() - 1;
    if (remaining > 0) {
      this.remainingSeconds.set(remaining);
      // 準備・休憩の残り3秒はカウントダウン音
      if (remaining <= 3 && (this.phase() === 'prepare' || this.phase() === 'rest')) {
        this.sound.playCountdown();
      }
      return;
    }
    this.transition();
  }

  private transition(): void {
    switch (this.phase()) {
      case 'prepare':
        this.startWork();
        break;
      case 'work':
        if (this.currentSet() >= this.settings().totalSets) {
          this.finish();
        } else {
          this.sound.playSetEnd();
          this.phase.set('rest');
          this.remainingSeconds.set(this.settings().restSeconds);
        }
        break;
      case 'rest':
        this.startWork();
        break;
      default:
        break;
    }
  }

  private startWork(): void {
    this.currentSet.update((set) => set + 1);
    this.phase.set('work');
    this.remainingSeconds.set(this.settings().workSeconds);
    this.sound.playSetStart();
  }

  private finish(): void {
    this.stopTicking();
    this.sound.playSetEnd();
    this.sound.playFinish();
    this.phase.set('finished');
    this.remainingSeconds.set(0);
    this.isRunning.set(false);
    void this.wakeLock.release();
  }

  private startTicking(): void {
    this.stopTicking();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  private stopTicking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
