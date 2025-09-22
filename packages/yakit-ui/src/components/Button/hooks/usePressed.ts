import { useEffect, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export const usePressed = () => {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setPressed(false);
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setPressed(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 这里是 React 合成事件
  const bind = {
    onMouseDown: () => setPressed(true),
    onMouseLeave: () => setPressed(false),
    onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setPressed(true);
      }
    },
  } as const;

  return { pressed, bind };
};
