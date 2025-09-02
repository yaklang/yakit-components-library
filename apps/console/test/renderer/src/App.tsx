import { FC, useState } from 'react'

const { ipcRenderer } = window.electronApi

const light = {
  foreground: '#5a5d64',
  background: '#eef0f3',
  cursor: '#5a5d64',
  black: '#171717',
  brightBlack: '#353639',
  red: '#b93939',
  brightRed: '#f15757',
  green: '#379969',
  brightGreen: '#54ca90',
  yellow: '#c59d0a',
  brightYellow: '#ffce1e',
  blue: '#296bc5',
  brightBlue: '#4493ff',
  magenta: '#a83daa',
  brightMagenta: '#dc5cdf',
  cyan: '#22a5b6',
  brightCyan: '#3cd8ed',
  white: '#f8f9fa',
  brightWhite: '#ffffff'
}

const dark = {
  foreground: '#bac3d4',
  background: '#37393c',
  cursor: '#bac3d4',
  black: '#171717',
  brightBlack: '#f0f2f6',
  red: '#f37373',
  brightRed: '#d94040',
  green: '#71d3a3',
  brightGreen: '#3db379',
  yellow: '#ffdd64',
  brightYellow: '#e8bf2e',
  blue: '#63a5ff',
  brightBlue: '#2d7ce8',
  magenta: '#e277e4',
  brightMagenta: '#c545c7',
  cyan: '#5cdff0',
  brightCyan: '#25c1d6',
  white: '#2a2b2d',
  brightWhite: '#171717'
}
const App: FC = () => {
  const [theme, setTheme] = useState(false)
  return (
    <div>
      <button
        onClick={() => {
          ipcRenderer.invoke('open-console-new-window')
          setTimeout(() => {
            ipcRenderer.send(
              'forward-xterm-data',
              `===========History log=========
[INFO] 2025-08-28 16:06:49 [yak:565] start to startup grpc server...
[INFO] 2025-08-28 16:06:49 [yak:567] the current yak grpc for '127.0.0.1', if u want to connect from other host. use
    yak grpc --host 0.0.0.0
[INFO] 2025-08-28 16:06:49 [facade_server:381] start to listen reverse(facade) on: 0.0.0.0:62455     
[INFO] 2025-08-28 16:06:49 [yak:570] yak grpc ok
[INFO] 2025-08-28 16:06:53 [grpc_project:82] Set project db by grpc: C:\\bo\\software\\yakit\\yakit-projects\\default-yakit.db
[INFO] 2025-08-28 16:06:54 [duplex_conn:51] Register server push callback: 2e6a74ba-1a1f-48b4-b426-2c9ca741a867
[INFO] 2025-08-28 16:27:49 [mitmloop:60] mitm frontend active connections count: 1
[INFO] 2025-08-28 16:28:13 [mitmloop:60] mitm frontend active connections count: 2
[INFO] 2025-08-28 16:28:19 [mitmloop:60] mitm frontend active connections count: 1
[INFO] 2025-08-28 16:28:46 [mitmloop:60] mitm frontend active connections count: 2
[INFO] 2025-08-28 16:28:52 [mitmloop:60] mitm frontend active connections count: 1
[INFO] 2025-08-28 16:29:03 [grpc_duplex_conn:82] current dialx cps:1
[INFO] 2025-08-28 16:29:04 [grpc_duplex_conn:65] current lowhttp rps:1
[INFO] 2025-08-28 16:29:04 [grpc_duplex_conn:82] current dialx cps:0
[INFO] 2025-08-28 16:29:05 [grpc_duplex_conn:65] current lowhttp rps:0
===========Real time log=========`
            )
          }, 3000)
        }}
      >
        打开console窗口
      </button>
      <button
        onClick={() => {
          ipcRenderer.send('forward-xterm-theme', theme ? light : dark)
          setTheme((prev) => !prev)
        }}
      >
        切换主题
      </button>
    </div>
  )
}

export default App
