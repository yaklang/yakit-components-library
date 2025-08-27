import { BrowserWindow, ipcMain } from 'electron'
import type { CreateWindowOption, CreateWindowRes, WindowItem } from '../types/interface'

const windows: WindowItem[] = []

export const registerIpc = (): void => {
  ipcMain.handle('create-window', async (_, data: CreateWindowOption): Promise<CreateWindowRes> => {
    const { url, id, windowOptions } = data
    if (id) {
      const win = windows.find((i) => i.id === id)
      if (!win)
        return {
          id,
          msg: '窗口id不存在'
        }
      win.window.focus()
      return {
        id,
        msg: '窗口已聚焦'
      }
    }
    if (url) {
      const winId = Date.now()
      const options = Object.assign(
        {
          width: 800,
          height: 600,
          webPreferences: {
            preload: __dirname + '/preload.js'
          }
        },
        windowOptions
      )
      const win = new BrowserWindow(options)
      await win.loadURL(url)
      windows.push({
        id: winId,
        window: win
      })
      return {
        id: winId,
        msg: '创建成功'
      }
    }
    return {
      id: -1,
      msg: '参数错误'
    }
  })

  ipcMain.handle('close-window', async (_, id) => {
    console.log('data:', id)
    const win = windows.find((i) => i.id === id)
    if (!win)
      return {
        id,
        msg: '窗口id不存在'
      }
    await win?.window.close()
    return {
      id,
      msg: '窗口id已关闭'
    }
  })
}
