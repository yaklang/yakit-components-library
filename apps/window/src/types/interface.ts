import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

export interface CreateWindowOption<T = unknown> {
  url?: string
  id?: number
  data: T
  windowOptions?: BrowserWindowConstructorOptions
}

export interface WindowItem {
  id: number
  window: BrowserWindow
}

export interface CreateWindowRes {
  id: number
  msg: string
}
