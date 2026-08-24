import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('electronApi', {
  ipcRenderer: {
    ...ipcRenderer,
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener) // 返回卸载函数
    }
  }
})
