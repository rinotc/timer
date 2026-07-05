import { Component, computed, inject } from '@angular/core';
import { SoundService } from './sound.service';
import { TabataPhase, TabataSettings, TabataTimerService } from './tabata-timer.service';
import { WakeLockService } from './wake-lock.service';

const PHASE_LABELS: Record<TabataPhase, string> = {
  idle: '準備完了',
  prepare: '準備',
  work: 'ワーク',
  rest: '休憩',
  finished: '完了!',
};

@Component({
  selector: 'app-tabata-timer',
  templateUrl: './tabata-timer.html',
  styleUrl: './tabata-timer.css',
})
export class TabataTimer {
  protected readonly timer = inject(TabataTimerService);
  protected readonly sound = inject(SoundService);
  protected readonly wakeLock = inject(WakeLockService);

  protected readonly phaseLabel = computed(() => PHASE_LABELS[this.timer.phase()]);

  protected readonly displayTime = computed(() => {
    const total = this.timer.remainingSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  protected readonly setLabel = computed(() => {
    const current = this.timer.isIdle() ? 0 : this.timer.currentSet();
    return `${current} / ${this.timer.settings().totalSets}`;
  });

  protected readonly wakeLockStatus = computed(() => {
    if (!this.timer.isActive()) {
      return null;
    }
    if (!this.wakeLock.supported()) {
      return 'このブラウザでは画面スリープ防止に対応していません。';
    }
    if (this.wakeLock.active()) {
      return 'タイマー動作中は画面スリープを防止しています。';
    }
    return this.wakeLock.errorMessage() ?? '画面スリープ防止を有効化できませんでした。';
  });

  protected onSettingChange(key: keyof TabataSettings, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number.parseInt(input.value, 10);
    if (Number.isNaN(value) || value < (key === 'prepareSeconds' ? 0 : 1)) {
      return;
    }
    this.timer.updateSettings({ [key]: value });
  }
}
