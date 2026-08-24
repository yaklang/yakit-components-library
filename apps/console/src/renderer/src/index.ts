import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { IpcChannels } from '../../type'

const { ipcRenderer } = window.electronApi
const terminalDom = document.getElementById('terminal')

const getLocalValue = async (k, defaultValue) => {
  try {
    const result = await ipcRenderer.invoke(IpcChannels.cache, k)
    return result ?? defaultValue
  } catch {
    return defaultValue
  }
}

getLocalValue('theme', 'light').then((t) => {
  document.documentElement.setAttribute('data-theme', t)
})

ipcRenderer.on(IpcChannels.theme, (_, { xtermThemeVars }) => {
  term.options.theme = xtermThemeVars
  document.body.style.backgroundColor = xtermThemeVars.background || ''
  terminalDom!.style.backgroundColor = xtermThemeVars.background || ''
})

ipcRenderer.on(IpcChannels.data, (_, data) => {
  term.write(data)
})

const term = new Terminal({
  convertEol: true
})
const fitAddon = new FitAddon()
term.loadAddon(fitAddon)

term.open(terminalDom!)
fitAddon.fit()

// 监听窗口大小变化
window.addEventListener('resize', () => fitAddon.fit())

// 复制
term.attachCustomKeyEventHandler((event) => {
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
    const selection = term.getSelection()
    if (selection) {
      ipcRenderer.send(IpcChannels.copy, selection)
      return false
    }
  }
  return true
})
