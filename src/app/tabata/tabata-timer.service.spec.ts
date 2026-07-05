import { TestBed } from '@angular/core/testing';
import { SoundService } from './sound.service';
import { TabataTimerService } from './tabata-timer.service';
import { WakeLockService } from './wake-lock.service';

describe('TabataTimerService', () => {
  let service: TabataTimerService;
  let sound: SoundService;
  let wakeLock: WakeLockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabataTimerService);
    sound = TestBed.inject(SoundService);
    wakeLock = TestBed.inject(WakeLockService);
    vi.spyOn(sound, 'unlock').mockImplementation(() => {});
    vi.spyOn(sound, 'playSetStart').mockImplementation(() => {});
    vi.spyOn(sound, 'playSetEnd').mockImplementation(() => {});
    vi.spyOn(sound, 'playCountdown').mockImplementation(() => {});
    vi.spyOn(sound, 'playFinish').mockImplementation(() => {});
    vi.spyOn(wakeLock, 'engage').mockResolvedValue();
    vi.spyOn(wakeLock, 'release').mockResolvedValue();
  });

  afterEach(() => {
    service.reset();
    vi.restoreAllMocks();
  });

  /** 指定秒数ぶん tick を進めるヘルパー */
  function advance(seconds: number): void {
    for (let i = 0; i < seconds; i++) {
      service.tick();
    }
  }

  it('初期状態は idle', () => {
    expect(service.phase()).toBe('idle');
    expect(service.isRunning()).toBe(false);
    expect(service.settings()).toEqual({
      prepareSeconds: 10,
      workSeconds: 20,
      restSeconds: 10,
      totalSets: 8,
    });
  });

  it('start で準備フェーズに入り画面スリープ防止を有効化する', () => {
    service.start();
    expect(service.phase()).toBe('prepare');
    expect(service.remainingSeconds()).toBe(10);
    expect(service.isRunning()).toBe(true);
    expect(wakeLock.engage).toHaveBeenCalledTimes(1);
  });

  it('準備時間が 0 の場合は即ワークが始まる', () => {
    service.updateSettings({ prepareSeconds: 0 });
    service.start();
    expect(service.phase()).toBe('work');
    expect(service.currentSet()).toBe(1);
    expect(sound.playSetStart).toHaveBeenCalledTimes(1);
  });

  it('準備フェーズ終了でワークが始まり、セット開始音が鳴る', () => {
    service.start();
    advance(10);
    expect(service.phase()).toBe('work');
    expect(service.currentSet()).toBe(1);
    expect(service.remainingSeconds()).toBe(20);
    expect(sound.playSetStart).toHaveBeenCalledTimes(1);
  });

  it('ワーク終了で休憩に入り、セット終了音が鳴る', () => {
    service.start();
    advance(10 + 20);
    expect(service.phase()).toBe('rest');
    expect(service.remainingSeconds()).toBe(10);
    expect(sound.playSetEnd).toHaveBeenCalledTimes(1);
  });

  it('休憩終了で次のセットが始まり、セット開始音が鳴る', () => {
    service.start();
    advance(10 + 20 + 10);
    expect(service.phase()).toBe('work');
    expect(service.currentSet()).toBe(2);
    expect(sound.playSetStart).toHaveBeenCalledTimes(2);
  });

  it('全セット完了で finished になり、終了音と完了音が鳴って画面スリープ防止を解除する', () => {
    service.updateSettings({ totalSets: 2 });
    service.start();
    // 準備 10 + (ワーク 20 + 休憩 10) + ワーク 20
    advance(10 + 20 + 10 + 20);
    expect(service.phase()).toBe('finished');
    expect(service.isRunning()).toBe(false);
    expect(sound.playSetStart).toHaveBeenCalledTimes(2);
    expect(sound.playSetEnd).toHaveBeenCalledTimes(2);
    expect(sound.playFinish).toHaveBeenCalledTimes(1);
    expect(wakeLock.release).toHaveBeenCalledTimes(1);
  });

  it('準備・休憩の残り3秒でカウントダウン音が鳴る', () => {
    service.start();
    advance(9);
    expect(sound.playCountdown).toHaveBeenCalledTimes(3);
  });

  it('pause で停止し resume で再開できる', () => {
    service.start();
    service.pause();
    expect(service.isRunning()).toBe(false);
    expect(service.phase()).toBe('prepare');
    expect(wakeLock.release).toHaveBeenCalledTimes(1);
    service.resume();
    expect(service.isRunning()).toBe(true);
    expect(wakeLock.engage).toHaveBeenCalledTimes(2);
  });

  it('reset で idle に戻り画面スリープ防止も解除する', () => {
    service.start();
    advance(15);
    service.reset();
    expect(service.phase()).toBe('idle');
    expect(service.remainingSeconds()).toBe(0);
    expect(service.currentSet()).toBe(0);
    expect(service.isRunning()).toBe(false);
    expect(wakeLock.release).toHaveBeenCalledTimes(1);
  });

  it('動作中は設定を変更できない', () => {
    service.start();
    service.updateSettings({ totalSets: 3 });
    expect(service.settings().totalSets).toBe(8);
  });

  it('不正でない設定変更は反映される', () => {
    service.updateSettings({ workSeconds: 30, restSeconds: 15 });
    expect(service.settings().workSeconds).toBe(30);
    expect(service.settings().restSeconds).toBe(15);
  });
});
