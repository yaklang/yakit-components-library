import type { SearchProps } from '../Input/type'

export type {
  SearchIconPosition,
  SearchInputSize,
  SearchInputVariant,
  SearchSelectorOption,
  SearchSelectorProps,
} from '../Input/type'

export interface SearchInputProps extends Omit<SearchProps, 'iconPosition' | 'variant'> {
  /** @deprecated `icon-only` 请迁移到 Input.SearchTrigger。 */
  variant?: SearchProps['variant'] | 'icon-only'
  /** @deprecated `only` 请迁移到 Input.SearchTrigger。 */
  iconPosition?: SearchProps['iconPosition'] | 'only'
}
