import { useRef, useState, useSyncExternalStore } from 'react'

import useIsomorphicLayoutEffect from '../../../hooks/useIsomorphicLayoutEffect'
import type { SpinGetContainer } from '../type'

const warnGetContainer = (message: string) => {
  if (import.meta.env.DEV) {
    console.warn(`[yakit-spin] ${message}`)
  }
}

const toHTMLElement = (node: unknown, source: string): HTMLElement | null => {
  if (node == null) {
    return null
  }
  if (node instanceof HTMLElement) {
    return node
  }
  warnGetContainer(`${source} did not resolve to an HTMLElement.`)
  return null
}

const resolveGetContainer = (getContainer: SpinGetContainer): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null
  }

  if (typeof getContainer === 'string') {
    try {
      return toHTMLElement(document.querySelector(getContainer), `getContainer="${getContainer}"`)
    } catch {
      warnGetContainer(`getContainer selector is invalid: "${getContainer}"`)
      return null
    }
  }

  if (typeof getContainer === 'function') {
    return toHTMLElement(getContainer(), 'getContainer()')
  }

  return toHTMLElement(getContainer, 'getContainer')
}

export const isViewportContainer = (node: HTMLElement) => node === document.body || node === document.documentElement

type ContainerPositionLock = {
  count: number
  previousPosition: string
}

const containerPositionLocks = new WeakMap<HTMLElement, ContainerPositionLock>()

const acquireContainerPosition = (node: HTMLElement) => {
  if (isViewportContainer(node)) {
    return
  }

  const current = containerPositionLocks.get(node)
  if (current) {
    current.count += 1
    return
  }

  if (getComputedStyle(node).position !== 'static') {
    return
  }

  containerPositionLocks.set(node, { count: 1, previousPosition: node.style.position })
  node.style.position = 'relative'
}

const releaseContainerPosition = (node: HTMLElement) => {
  const current = containerPositionLocks.get(node)
  if (!current) {
    return
  }

  current.count -= 1
  if (current.count > 0) {
    return
  }

  containerPositionLocks.delete(node)
  node.style.position = current.previousPosition
}

const subscribeIsomorphicHydration = () => () => {}
const getClientHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

/**
 * 解析 `getContainer`，并在目标容器上按需加上定位。
 */
export const useSpinContainer = (getContainer?: SpinGetContainer) => {
  // 服务端快照为 false，因此 SSR 和 hydration 首帧都只渲染子节点。
  // 客户端直接渲染（createRoot）会马上读到客户端快照，已知容器在首帧就会挂上 portal，父级 layout effect 也能拿到 ref。
  const isHydrated = useSyncExternalStore(
    subscribeIsomorphicHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  )

  const resolved = !isHydrated || getContainer == null ? null : resolveGetContainer(getContainer)
  const [target, setTarget] = useState<HTMLElement | null>(resolved)
  const ownedNodeRef = useRef<HTMLElement | null>(null)

  // 节点、选择器，以及已经能返回节点的函数，可以在当次渲染里解析，这样 CSR 首帧就会挂上遮罩和 ref。
  // 仍返回 null 的函数（例如 `() => ref.current`）可能要等 commit 之后才能解析，先保留上一次的 target，交给 layout effect 同步。
  if (resolved !== target && (resolved != null || typeof getContainer !== 'function')) {
    setTarget(resolved)
  }

  // 每次 commit 后再解析一次，这样函数才能拿到稍后出现的容器；只改回调引用时不会重写定位。
  // 有意不加依赖数组；只有解析到的节点身份变化时才会改定位。
  useIsomorphicLayoutEffect(() => {
    if (!isHydrated) {
      return
    }

    const node = getContainer == null ? null : resolveGetContainer(getContainer)
    setTarget((prev) => (prev === node ? prev : node))

    const prevOwned = ownedNodeRef.current
    if (prevOwned === node) {
      return
    }

    if (prevOwned) {
      releaseContainerPosition(prevOwned)
    }
    if (node) {
      acquireContainerPosition(node)
    }
    ownedNodeRef.current = node
  })

  useIsomorphicLayoutEffect(
    () => () => {
      if (ownedNodeRef.current) {
        releaseContainerPosition(ownedNodeRef.current)
        ownedNodeRef.current = null
      }
    },
    [],
  )

  return resolved ?? (typeof getContainer === 'function' ? target : resolved)
}
