import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type WakeLockType = 'screen';

type WakeLockRequest = {
  request(type: WakeLockType): Promise<WakeLockSentinelLike>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: WakeLockRequest;
};

type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release(): Promise<void>;
};

/**
 * 画面スリープ防止の Wake Lock API を扱うサービス。
 * タイマー動作中のみ画面が暗転・ロックしないように維持する。
 */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private readonly document = inject(DOCUMENT);

  readonly supported = computed(() => this.getWakeLockApi() !== null);
  readonly active = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private sentinel: WakeLockSentinelLike | null = null;
  private shouldStayAwake = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  async engage(): Promise<void> {
    this.shouldStayAwake = true;
    await this.acquire();
  }

  async release(): Promise<void> {
    this.shouldStayAwake = false;
    await this.releaseSentinel();
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.document.visibilityState !== 'visible' || !this.shouldStayAwake) {
      return;
    }
    void this.acquire();
  };

  private async acquire(): Promise<void> {
    if (this.document.visibilityState !== 'visible') {
      return;
    }

    const wakeLock = this.getWakeLockApi();
    if (!wakeLock) {
      this.errorMessage.set('このブラウザでは画面スリープ防止に対応していません。');
      return;
    }

    if (this.sentinel && !this.sentinel.released) {
      this.active.set(true);
      this.errorMessage.set(null);
      return;
    }

    try {
      const sentinel = await wakeLock.request('screen');
      sentinel.addEventListener('release', this.handleRelease);
      this.sentinel = sentinel;
      this.active.set(true);
      this.errorMessage.set(null);
    } catch {
      this.sentinel = null;
      this.active.set(false);
      this.errorMessage.set('画面スリープ防止を有効化できませんでした。');
    }
  }

  private readonly handleRelease = (): void => {
    if (!this.sentinel?.released) {
      return;
    }
    this.sentinel.removeEventListener('release', this.handleRelease);
    this.sentinel = null;
    this.active.set(false);
  };

  private async releaseSentinel(): Promise<void> {
    if (!this.sentinel) {
      this.active.set(false);
      return;
    }

    const sentinel = this.sentinel;
    sentinel.removeEventListener('release', this.handleRelease);
    this.sentinel = null;

    try {
      await sentinel.release();
    } finally {
      this.active.set(false);
    }
  }

  private getWakeLockApi(): WakeLockRequest | null {
    if (typeof navigator === 'undefined') {
      return null;
    }
    return (navigator as WakeLockNavigator).wakeLock ?? null;
  }
}
