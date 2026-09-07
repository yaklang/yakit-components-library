import React, { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Wave from '../../src/components/Animation/Wave';
import { cleanup, render } from '../helpers/render';

let animationFrameId = 0;
type AnimationFrameCallback = (time: number) => void;
let animationFrames = new Map<number, AnimationFrameCallback>();

const flushAnimationFrames = () => {
  const queuedFrames = [...animationFrames.values()];
  animationFrames.clear();
  queuedFrames.forEach((callback) => callback(performance.now()));
};

const setReducedMotion = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches } as MediaQueryList));
};

beforeEach(() => {
  vi.useFakeTimers();
  animationFrameId = 0;
  animationFrames = new Map();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: AnimationFrameCallback) => {
      animationFrameId += 1;
      animationFrames.set(animationFrameId, callback);
      return animationFrameId;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      animationFrames.delete(id);
    }),
  );
  setReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Wave', () => {
  it('returns non-element children unchanged', () => {
    const { container } = render(<Wave animation="wave">Plain text</Wave>);

    expect(container).toHaveTextContent('Plain text');
    expect(container.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('merges classes and preserves child handlers when animation is disabled', () => {
    const onMouseUp = vi.fn();
    const onKeyUp = vi.fn();
    const { container } = render(
      <Wave animation={false} className="wave-class" rootClassName="wave-root">
        <button className="child-class" onKeyUp={onKeyUp} onMouseUp={onMouseUp}>
          Disabled wave
        </button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

    expect(button).toHaveClass('child-class', 'yakit-wave', 'wave-class', 'wave-root');
    expect(onMouseUp).toHaveBeenCalledOnce();
    expect(onKeyUp).toHaveBeenCalledTimes(2);
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it.each(['Enter', ' '] as const)('creates one holder for the %s key', (key) => {
    const onKeyUp = vi.fn();
    const { container } = render(
      <Wave animation="wave">
        <button onKeyUp={onKeyUp}>Keyboard wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key }));

    expect(onKeyUp).toHaveBeenCalledOnce();
    expect(button?.querySelectorAll('.yakit-wave-holder')).toHaveLength(1);
  });

  it('ignores unrelated keys while preserving the child handler', () => {
    const onKeyUp = vi.fn();
    const { container } = render(
      <Wave animation="wave">
        <button onKeyUp={onKeyUp}>Keyboard wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Escape' }));

    expect(onKeyUp).toHaveBeenCalledOnce();
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('sizes the holder from observable geometry and applies the effect on RAF', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      borderLeftWidth: '3px',
      borderTopWidth: '2px',
    } as CSSStyleDeclaration);
    const { container } = render(
      <Wave animation="wave">
        <button>Measured wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('expected a button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 60,
      height: 40,
      left: 10,
      right: 110,
      top: 20,
      width: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const holder = button.querySelector<HTMLElement>('.yakit-wave-holder');
    const effect = holder?.querySelector<HTMLElement>('.yakit-wave-effect');

    expect(holder?.style.width).toBe('100px');
    expect(holder?.style.height).toBe('40px');
    expect(holder?.style.left).toBe('-3px');
    expect(holder?.style.top).toBe('-2px');
    expect(effect?.style.boxShadow).toBe('');

    flushAnimationFrames();

    expect(effect?.style.boxShadow).toBe('0 0 0 8px var(--wave-color)');
    expect(effect?.style.opacity).toBe('0');
  });

  it('cleans up on transitionend and does not mutate the DOM afterward', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onMouseUp = vi.fn();
    const { container } = render(
      <Wave animation="wave">
        <button onMouseUp={onMouseUp}>Transition wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(onMouseUp).toHaveBeenCalledOnce();
    const effect = button?.querySelector<HTMLElement>('.yakit-wave-effect');
    effect?.dispatchEvent(new Event('transitionend'));

    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    flushAnimationFrames();
    vi.runAllTimers();
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('keeps the holder for 499ms and removes it at the 500ms fallback', () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Timed wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull();

    vi.advanceTimersByTime(499);
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(animationFrames).toHaveLength(0);
  });

  it('removes the holder immediately for reduced motion', () => {
    setReducedMotion(true);
    const { container } = render(
      <Wave animation="wave">
        <button>Reduced motion</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(animationFrames).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('creates and cleans a wave when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { container } = render(
      <Wave animation="wave">
        <button>No matchMedia</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    expect(() => button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))).not.toThrow();
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull();

    vi.advanceTimersByTime(500);
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('lets repeated holders finish independently', () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Repeated wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const effects = [...(button?.querySelectorAll<HTMLElement>('.yakit-wave-effect') ?? [])];
    expect(effects).toHaveLength(2);

    effects[0]?.dispatchEvent(new Event('transitionend'));
    expect(button?.querySelectorAll('.yakit-wave-holder')).toHaveLength(1);

    vi.advanceTimersByTime(500);
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('merges object and callback refs and clears them on unmount', () => {
    const objectRef = createRef<HTMLButtonElement>();
    const callbackRef = vi.fn<(node: HTMLButtonElement | null) => void>();
    const object = render(
      <Wave animation="wave">
        <button ref={objectRef}>Object ref</button>
      </Wave>,
    );
    const callback = render(
      <Wave animation="wave">
        <button ref={callbackRef}>Callback ref</button>
      </Wave>,
    );

    expect(objectRef.current).toBe(object.container.querySelector('button'));
    expect(callbackRef).toHaveBeenLastCalledWith(callback.container.querySelector('button'));

    cleanup();

    expect(objectRef.current).toBeNull();
    expect(callbackRef).toHaveBeenLastCalledWith(null);
  });

  it('removes every holder and scheduled callback when unmounted', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(
      <Wave animation="wave">
        <button>Unmount wave</button>
      </Wave>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(button?.querySelectorAll('.yakit-wave-holder')).toHaveLength(2);

    cleanup();
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(animationFrames).toHaveLength(0);

    flushAnimationFrames();
    vi.runAllTimers();
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
