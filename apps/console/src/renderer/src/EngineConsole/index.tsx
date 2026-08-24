// import '../../../preload/index.d'
// import { useEffect, useRef } from 'react'
// import { Terminal } from 'xterm'
// import 'xterm/css/xterm.css'
// import { FitAddon } from 'xterm-addon-fit'

// const { ipcRenderer } = window.electronApi
// const EngineConsole = () => {
//   const terminalRef = useRef<HTMLDivElement>(null)
//   const termRef = useRef<Terminal>(null)
//   const fitAddonRef = useRef<FitAddon>(null)

//   useEffect(() => {
//     const term = new Terminal({ convertEol: true })
//     const fitAddon = new FitAddon()

//     term.loadAddon(fitAddon)
//     termRef.current = term
//     fitAddonRef.current = fitAddon

//     const initTerminal = () => {
//       const terminalDom = terminalRef.current
//       if (terminalDom?.clientWidth && terminalDom?.clientHeight) {
//         term.open(terminalDom)
//         fitAddon.fit()
//       }
//     }
//     initTerminal()
//     // 监听窗口 resize
//     const handleResize = () => fitAddon.fit()
//     window.addEventListener('resize', handleResize)

//     // IPC: 主题设置
//     ipcRenderer.on('xterm-theme', (_, data) => {
//       term.options.theme = data.xtermThemeVars
//       if (terminalRef.current) {
//         terminalRef.current.style.backgroundColor = data.xtermThemeVars.background
//       }
//       document.body.style.backgroundColor = data.xtermThemeVars.background
//     })

//     // IPC: 终端数据写入
//     ipcRenderer.on('xterm-data', (_, data: string) => term.write(data))

//     // 自定义复制事件
//     term.attachCustomKeyEventHandler((event) => {
//       if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
//         const selection = term.getSelection()
//         if (selection) {
//           ipcRenderer.send('console-terminal-window-copy', selection)
//           return false
//         }
//       }
//       return true
//     })

//     // 读取本地缓存主题
//     const getLocalValue = async (k: string, defaultValue: string) => {
//       try {
//         const result = await ipcRenderer.invoke('fetch-local-cache', k)
//         return result ?? defaultValue
//       } catch {
//         return defaultValue
//       }
//     }

//     getLocalValue('theme', 'light').then((t) => {
//       document.documentElement.setAttribute('data-theme', t)
//     })

//     return () => {
//       term.dispose()
//       fitAddon.dispose()
//       window.removeEventListener('resize', handleResize)
//     }
//   }, [])

//   return (
//     <div
//       ref={terminalRef}
//       style={{
//         width: '100%',
//         height: '100%',
//         backgroundColor: 'black'
//       }}
//     />
//   )
// }

// export default EngineConsole
