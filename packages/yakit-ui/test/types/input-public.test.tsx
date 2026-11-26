import { createRef } from 'react'

import {
  ConfigProvider,
  Input,
  type InputProps,
  type InputRef,
  type InputNumberProps,
  type InputNumberRef,
  type SearchProps,
  type YakitConfigProviderProps,
} from '../../src/components'
import InputNumber, { InputNumber as NamedInputNumber } from '../../src/components/InputNumber'
import SearchInput, { type SearchInputProps } from '../../src/components/SearchInput'

export const inputProps: InputProps = {
  allowClear: true,
  error: true,
  size: 'middle',
  status: 'warning',
}

export const searchProps: SearchProps = {
  selector: {
    options: [{ label: '关键词', value: 'keyword' }],
  },
  size: 'huge',
  variant: 'dropdown',
}

export const inputRef = createRef<InputRef>()
export const inputNumberRef = createRef<InputNumberRef>()

export const inputNumberProps: InputNumberProps<string> = {
  controls: 'horizontal',
  defaultValue: '9007199254740993.01',
  size: 'huge',
  stringMode: true,
}

export const configProviderProps: YakitConfigProviderProps = {
  locale: {
    locale: 'zh-CN',
    Input: { clear: '清除内容' },
    Search: { search: '执行搜索' },
  },
  theme: { mode: 'dark', token: { colorPrimary: '#F28C45' } },
}

export const invalidConfigProviderAlgorithm: YakitConfigProviderProps = {
  theme: {
    // @ts-expect-error Ant Design theme algorithms are not part of the Yakit provider contract.
    algorithm: 'darkAlgorithm',
  },
}

export const invalidConfigProviderPrefix: YakitConfigProviderProps = {
  // @ts-expect-error Yakit public class names are fixed and prefixCls is not supported.
  prefixCls: 'custom',
}

export const editableSearchAliasProps: SearchInputProps = searchProps
export const legacyIconOnlySearchProps: SearchInputProps = {
  iconPosition: 'only',
  variant: 'icon-only',
}

export const compoundInputs = (
  <>
    <Input ref={inputRef} {...inputProps} />
    <Input.TextArea autoSize />
    <Input.Search {...searchProps} />
    <Input.Password visibilityToggle={{ tabIndex: 0 }} />
    <Input.OTP length={4} />
    <Input.SearchTrigger onPress={() => undefined} />
    <Input.Select aria-label="协议">https://</Input.Select>
    <ConfigProvider {...configProviderProps} />
  </>
)

export const standaloneNumbers = (
  <>
    <InputNumber {...inputNumberProps} ref={inputNumberRef} value="1.01" />
    <NamedInputNumber defaultValue={1} />
  </>
)

export const legacySearch = <SearchInput {...searchProps} />

export const invalidInputProps: InputProps = {
  // @ts-expect-error addonBefore is not a public Yakit Input API.
  addonBefore: 'deprecated',
}

// @ts-expect-error bordered is replaced by variant.
export const invalidBorderedInput = <Input bordered />

// @ts-expect-error Input.Number is intentionally not exposed.
export const missingInputNumberMember = Input.Number

// @ts-expect-error Input.Group is intentionally not exposed.
export const missingInputGroupMember = Input.Group

// @ts-expect-error custom string masks are not part of the owned native OTP contract.
export const invalidOtpStringMask = <Input.OTP mask="*" />

export const invalidSearchActionArray = (
  <Input.Search
    // @ts-expect-error Search accepts one action element rather than an array of nested controls.
    enterButton={[<button key="first">First</button>]}
  />
)

// @ts-expect-error addonBefore is intentionally absent from standalone Yakit InputNumber.
export const invalidInputNumberAddonBefore = <InputNumber addonBefore="prefix" />

// @ts-expect-error addonAfter is intentionally absent from standalone Yakit InputNumber.
export const invalidInputNumberAddonAfter = <InputNumber addonAfter="suffix" />

// @ts-expect-error bordered is replaced by variant on standalone Yakit InputNumber.
export const invalidBorderedInputNumber = <InputNumber bordered />
