import { useEffect, useState } from 'react';

const shouldDelay = (spinning: boolean, delay: number) =>
  spinning && delay > 0 && !Number.isNaN(delay);

/**
 * 延迟显示加载状态，避免短暂的 spinning 闪一下。
 * `delay` 为 0 或不传时，与传入的 spinning 同步，首屏不会先空一帧。
 */
export const useDelayedSpinning = (spinning: boolean, delay = 0) => {
  const [visible, setVisible] = useState(() => spinning && !shouldDelay(spinning, delay));

  useEffect(() => {
    if (!spinning) {
      setVisible(false);
      return;
    }

    if (!shouldDelay(spinning, delay)) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [spinning, delay]);

  return visible;
};
