import { forwardRef } from 'react'
import type React from 'react'

import { Search, SearchTrigger } from '../Input/Search'
import type { InputRef } from '../Input/type'

import type { SearchInputProps } from './type'

/**
 * @deprecated 新代码请使用 `Input.Search`；仅图标形态请使用 `Input.SearchTrigger`。
 */
export const SearchInput = forwardRef<InputRef | HTMLButtonElement, SearchInputProps>(
  ({ variant, iconPosition, onSearch, ...props }, ref) => {
    if (variant === 'icon-only' || iconPosition === 'only') {
      return (
        <SearchTrigger
          aria-label={props['aria-label'] ?? '搜索'}
          className={props.className}
          disabled={props.disabled}
          icon={props.icon === false ? null : props.icon}
          onPress={(event) => onSearch?.('', event, { source: 'input' })}
          ref={ref as React.ForwardedRef<HTMLButtonElement>}
          size={props.size}
          style={props.style}
        />
      )
    }

    return (
      <Search
        {...props}
        iconPosition={iconPosition}
        onSearch={onSearch}
        ref={ref as React.ForwardedRef<InputRef>}
        variant={variant}
      />
    )
  },
)

SearchInput.displayName = 'SearchInput'
