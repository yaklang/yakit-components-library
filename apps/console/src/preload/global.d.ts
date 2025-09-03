export {}

declare global {
  interface Window {
    electronApi: {
      ipcRenderer: Electron.IpcRenderer
    }
  }
}
