import { createRef } from 'react';

import {
  CopyText,
  type CopyTextProps,
  type CopyTextRef,
  type CopyTextSize,
} from '../../src/components';

export const small: CopyTextSize = 'small';
export const medium: CopyTextSize = 'medium';
export const large: CopyTextSize = 'large';

// @ts-expect-error default is not a public CopyText size.
export const invalidDefaultSize: CopyTextSize = 'default';

export const copyTextRef = createRef<CopyTextRef>();

export const copyTextProps: CopyTextProps = {
  showText: 'visible',
  copyText: 'actual',
  iconColor: 'var(--yakit-color-primary)',
  wrapStyle: { marginRight: 8 },
  disabled: false,
  size: 'large',
  className: 'extra',
  rootClassName: 'root',
  style: { color: 'red' },
  onAfterCopy: (_e, info) => {
    if (!info.ok) return;
  },
};

export const copyText = <CopyText ref={copyTextRef} {...copyTextProps} />;

export const invalidCopyable: CopyTextProps = {
  showText: 'text',
  // @ts-expect-error copyable is not part of the public CopyText API.
  copyable: true,
};

export const invalidYakitName: CopyTextProps = {
  showText: 'text',
  // @ts-expect-error wrapperClassName belongs to CollapseText, not CopyText.
  wrapperClassName: 'wrap',
};

// @ts-expect-error the public export is CopyText, not YakitCopyText.
export const invalidLegacyExport = CopyText.YakitCopyText;
