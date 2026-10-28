import React, { createRef, version } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Wave from '../../src/components/Animation/Wave';
import { cleanup, render } from '../helpers/render';

declare const __EXPECTED_REACT_MAJOR__: string;

afterEach(cleanup);

// 这份用例会分别在 React 18 和 React 19 下跑。
// React 18 的 ref 在元素上，React 19 的 ref 在 props 里，两边挂载后都要拿到同一个按钮。
describe('Wave child refs', () => {
  it('passes the mounted button to an object ref and a callback ref', () => {
    expect(Number.parseInt(version, 10)).toBe(Number(__EXPECTED_REACT_MAJOR__));

    const objectRef = createRef<HTMLButtonElement>();
    const callbackRef = vi.fn<(node: HTMLButtonElement | null) => void>();
    const objectView = render(
      <Wave animation="wave">
        <button ref={objectRef}>Object ref</button>
      </Wave>,
    );
    const callbackView = render(
      <Wave animation="wave">
        <button ref={callbackRef}>Callback ref</button>
      </Wave>,
    );
    const objectButton = objectView.container.querySelector('button');
    const callbackButton = callbackView.container.querySelector('button');

    expect(objectRef.current).toBe(objectButton);
    expect(callbackRef).toHaveBeenLastCalledWith(callbackButton);
  });
});
