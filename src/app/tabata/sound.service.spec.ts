import { TestBed } from '@angular/core/testing';
import { SoundService } from './sound.service';

type GainEvent = {
  type: 'set' | 'linear' | 'exponential';
  value: number;
  time: number;
};

class MockGainNode {
  readonly gain = {
    events: [] as GainEvent[],
    setValueAtTime: (value: number, time: number) => {
      this.gain.events.push({ type: 'set', value, time });
    },
    linearRampToValueAtTime: (value: number, time: number) => {
      this.gain.events.push({ type: 'linear', value, time });
    },
    exponentialRampToValueAtTime: (value: number, time: number) => {
      this.gain.events.push({ type: 'exponential', value, time });
    },
  };

  connect(): void {}
}

class MockOscillatorNode {
  type: OscillatorType = 'sine';
  readonly frequency = { value: 0 };
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  connect(): void {}

  start(time: number): void {
    this.startedAt = time;
  }

  stop(time: number): void {
    this.stoppedAt = time;
  }
}

class MockAudioContext {
  readonly currentTime = 10;
  readonly destination = {} as AudioDestinationNode;
  readonly state: AudioContextState = 'running';
  readonly oscillators: MockOscillatorNode[] = [];
  readonly gains: MockGainNode[] = [];

  createOscillator(): MockOscillatorNode {
    const oscillator = new MockOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): MockGainNode {
    const gain = new MockGainNode();
    this.gains.push(gain);
    return gain;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}

describe('SoundService', () => {
  let service: SoundService;
  let audioContext: MockAudioContext;
  let originalAudioContext: typeof AudioContext | undefined;
  class AudioContextMock {
    constructor() {
      return audioContext as unknown as AudioContext;
    }
  }

  beforeEach(() => {
    audioContext = new MockAudioContext();
    originalAudioContext = globalThis.AudioContext;
    globalThis.AudioContext = AudioContextMock as unknown as typeof AudioContext;

    TestBed.configureTestingModule({});
    service = TestBed.inject(SoundService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalAudioContext) {
      globalThis.AudioContext = originalAudioContext;
      return;
    }
    delete (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  });

  it('セット開始音は体育館でも聞こえやすい長めで大きめの音を鳴らす', () => {
    service.playSetStart();

    expect(audioContext.oscillators).toHaveLength(1);
    expect(audioContext.gains).toHaveLength(1);

    const oscillator = audioContext.oscillators[0];
    const gain = audioContext.gains[0];
    const peakGain = Math.max(...gain.gain.events.map((event) => event.value));

    expect(oscillator.type).toBe('square');
    expect(oscillator.startedAt).toBe(10);
    expect(oscillator.stoppedAt).toBeGreaterThanOrEqual(10.75);
    expect(peakGain).toBeGreaterThanOrEqual(0.55);
  });

  it('カウントダウン音も短すぎない長さで鳴らす', () => {
    service.playCountdown();

    const oscillator = audioContext.oscillators[0];

    expect(oscillator.stoppedAt).toBeGreaterThanOrEqual(10.25);
  });

  it('セット終了音は間を空けた2回の長めの音を鳴らす', () => {
    service.playSetEnd();

    expect(audioContext.oscillators).toHaveLength(2);
    expect(audioContext.oscillators[0].stoppedAt).toBeGreaterThanOrEqual(10.35);
    expect(audioContext.oscillators[1].startedAt).toBeGreaterThanOrEqual(10.45);
    expect(audioContext.oscillators[1].stoppedAt).toBeGreaterThan(10.79);
  });

  it('完了音は最後の音を十分長く鳴らす', () => {
    service.playFinish();

    expect(audioContext.oscillators).toHaveLength(3);
    expect(audioContext.oscillators[2].stoppedAt).toBeGreaterThanOrEqual(11.3);
  });

  it('音オフのときは再生しない', () => {
    service.toggleEnabled();

    service.playSetStart();

    expect(audioContext.oscillators).toHaveLength(0);
  });
});
