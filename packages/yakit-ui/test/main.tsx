import ReactDom from 'react-dom/client'

import { Button } from '../src/components'

ReactDom.createRoot(document.getElementById('root') as HTMLElement).render(
  <div
    style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Button type="outline1">按钮</Button>
  </div>,
)
