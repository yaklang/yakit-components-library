import { useEffect, useLayoutEffect } from 'react';

/** 浏览器里用 `useLayoutEffect`，服务端回退到 `useEffect`，避免 React 18 的 SSR 告警。 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default useIsomorphicLayoutEffect;
