import React from 'react'

import {
  LogoOutlined,
  StarOffOutlined,
  ImportSolid,
  FloatingSolid,
  ParkAboveSolid,
  ParkBelowSolid,
  ParkRightSolid,
  ParkLeftSolid,
  PaintbrushSolid,
  PaperAirplaneSolid,
  PillSolid,
} from '../../src'

export const outlineFragments = (
  <React.Fragment>
    <LogoOutlined />
    <LogoOutlined />
    <StarOffOutlined />
  </React.Fragment>
)

const fragmentIcons = [
  PaperAirplaneSolid,
  PaintbrushSolid,
  PillSolid,
  ImportSolid,
  FloatingSolid,
  ParkLeftSolid,
  ParkRightSolid,
  ParkAboveSolid,
  ParkBelowSolid,
]
export const solidFragments = (
  <React.Fragment>
    {fragmentIcons.flatMap((Component, index) => [
      <Component key={`${index}-first`} />,
      <Component key={`${index}-second`} />,
    ])}
  </React.Fragment>
)
