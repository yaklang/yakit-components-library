import { HomeOutlined, type IconProps } from '@yakit-libs/yakit-ui/icons'
import * as ColorfulIcons from '@yakit-libs/yakit-ui/icons/colorful'
import { AcademicCapOutlined } from '@yakit-libs/yakit-ui/icons/outline'
import { iconRegistry, outlineIconRegistry, solidIconRegistry } from '@yakit-libs/yakit-ui/icons/registry'
import { HomeSolid } from '@yakit-libs/yakit-ui/icons/solid'
import type { ComponentType } from 'react'

const acceptsIcon = (_icon: ComponentType<IconProps>) => undefined
const ColorfulIcon = Object.values(ColorfulIcons)[0]!

acceptsIcon(HomeOutlined)
acceptsIcon(AcademicCapOutlined)
acceptsIcon(HomeSolid)
acceptsIcon(ColorfulIcon)

const registries = [iconRegistry, outlineIconRegistry, solidIconRegistry]
void registries

export const LightIconTypeFixture = () => (
  <>
    <HomeOutlined aria-label="home" color="currentColor" size={16} />
    <AcademicCapOutlined className="outline" />
    <HomeSolid style={{ display: 'block' }} />
    <ColorfulIcon aria-label="colorful" />
  </>
)
