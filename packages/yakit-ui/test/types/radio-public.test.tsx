import { useState } from 'react'

import { YakitRadioButtons } from '../../src/components'

type ExtractorMode = 'regexp' | 'regexp-between'

export const RadioButtonsModeTypeFixture = () => {
  const [mode, setMode] = useState<ExtractorMode>('regexp-between')

  return (
    <YakitRadioButtons
      value={mode}
      onChange={(event) => setMode(event.target.value)}
      options={[
        { label: 'Between', value: 'regexp-between' },
        { label: 'Regex', value: 'regexp' },
      ]}
    />
  )
}
