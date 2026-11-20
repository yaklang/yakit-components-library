import { createRef } from 'react'

import { CollapseText, type CollapseTextProps, type CollapseTextRef } from '../../src/components'

export const collapseTextRef = createRef<CollapseTextRef>()

export const collapseTextProps: CollapseTextProps = {
  content: 'description',
  rows: 3,
  lineHeight: 16,
  fontSize: 12,
  wrapperClassName: 'wrap',
  className: 'extra',
  rootClassName: 'root',
  style: { maxWidth: 480 },
}

export const collapseText = <CollapseText ref={collapseTextRef} {...collapseTextProps} />

export const invalidRowsType: CollapseTextProps = {
  content: 'text',
  // @ts-expect-error rows is a number of visible lines, not a CSS value.
  rows: '3',
}

export const invalidExpandable: CollapseTextProps = {
  content: 'text',
  // @ts-expect-error expandable is not part of the public CollapseText API.
  expandable: true,
}

// @ts-expect-error the public export is CollapseText, not YakitCollapseText.
export const invalidLegacyExport = CollapseText.YakitCollapseText
