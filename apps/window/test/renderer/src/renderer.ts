const btns = document.querySelectorAll('button')
let id

btns.forEach((item, index) => {
  item.addEventListener('click', async () => {
    if (index === 0) {
      const data = await window.electron.ipcRenderer.invoke('create-window', {
        url: 'C:\\bo\\project\\window\\test\\renderer\\src\\test\\test.html',
        windowOptions: {
          width: 1000
        }
      })
      if (id) return
      id = data.id
    } else if (index === 1) {
      window.electron.ipcRenderer.invoke('create-window', {
        url: 'C:\\bo\\project\\window\\test\\renderer\\src\\test\\test2.html'
      })
    } else if (index === 2) {
      window.electron.ipcRenderer.invoke('create-window', { id })
    } else if (index === 3) {
      window.electron.ipcRenderer.invoke('close-window', id)
    } 
  })
})
