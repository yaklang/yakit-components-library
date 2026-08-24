import type { ComponentType } from 'react';
import { HomeOutlined, type IconProps } from 'yakit-ui/icons';
import { AcademicCapOutlined } from 'yakit-ui/icons/outline';
import { iconRegistry, outlineIconRegistry, solidIconRegistry } from 'yakit-ui/icons/registry';
import { HomeFilled } from 'yakit-ui/icons/solid';

const acceptsIcon = (_icon: ComponentType<IconProps>) => undefined;

acceptsIcon(HomeOutlined);
acceptsIcon(AcademicCapOutlined);
acceptsIcon(HomeFilled);

const registries = [iconRegistry, outlineIconRegistry, solidIconRegistry];
void registries;

export const LightIconTypeFixture = () => (
  <>
    <HomeOutlined aria-label="home" color="currentColor" size={16} />
    <AcademicCapOutlined className="outline" />
    <HomeFilled style={{ display: 'block' }} />
  </>
);
