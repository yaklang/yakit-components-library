import type React from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'

const roots: Root[] = []

export const render = (node: React.ReactNode) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const rerender = (next: React.ReactNode) => flushSync(() => root.render(next))
  rerender(node)
  return { container, root, rerender }
}

export const cleanup = () => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
}

export const setNativeInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
