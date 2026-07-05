import { TestBed } from '@angular/core/testing';
import { WakeLockService } from './wake-lock.service';

class MockWakeLockSentinel extends EventTarget {
  released = false;

  async release(): Promise<void> {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

describe('WakeLockService', () => {
  let service: WakeLockService;
  let requestSpy: ReturnType<typeof vi.fn>;
  let originalWakeLock: unknown;
  let firstSentinel: MockWakeLockSentinel;
  let secondSentinel: MockWakeLockSentinel;

  beforeEach(() => {
    firstSentinel = new MockWakeLockSentinel();
    secondSentinel = new MockWakeLockSentinel();
    requestSpy = vi.fn().mockResolvedValueOnce(firstSentinel).mockResolvedValue(secondSentinel);
    originalWakeLock = (navigator as Navigator & { wakeLock?: unknown }).wakeLock;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestSpy },
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(WakeLockService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: originalWakeLock,
    });
  });

  it('engage で画面スリープ防止を取得する', async () => {
    await service.engage();

    expect(requestSpy).toHaveBeenCalledWith('screen');
    expect(service.active()).toBe(true);
    expect(service.errorMessage()).toBeNull();
  });

  it('release で画面スリープ防止を解除する', async () => {
    await service.engage();

    await service.release();

    expect(firstSentinel.released).toBe(true);
    expect(service.active()).toBe(false);
  });

  it('未対応ブラウザではエラーメッセージを保持する', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: undefined,
    });

    await service.engage();

    expect(service.supported()).toBe(false);
    expect(service.active()).toBe(false);
    expect(service.errorMessage()).toBe('このブラウザでは画面スリープ防止に対応していません。');
  });

  it('表示に戻ったとき再取得を試みる', async () => {
    await service.engage();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await firstSentinel.release();

    requestSpy.mockClear();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    expect(requestSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(service.active()).toBe(true);
  });
});
