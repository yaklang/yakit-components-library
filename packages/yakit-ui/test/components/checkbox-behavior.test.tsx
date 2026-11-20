import React, { Fragment, useState } from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Checkbox from '../../src/components/Checkbox'
import { cleanup, render } from '../helpers/render'

afterEach(cleanup)

describe('Checkbox behavior', () => {
  it('does not override labeled indeterminate accessible name with locale aria-label', () => {
    const { container } = render(
      <Checkbox indeterminate defaultChecked={false}>
        全选
      </Checkbox>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    expect(input.getAttribute('aria-checked')).toBe('mixed')
    expect(input.getAttribute('aria-label')).toBeNull()
    expect(input.getAttribute('aria-labelledby')).toBeTruthy()
  })

  it('uses locale aria-label only for icon-only indeterminate', () => {
    const { container } = render(<Checkbox indeterminate aria-label={undefined} />)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    expect(input.getAttribute('aria-checked')).toBe('mixed')
    expect(input.getAttribute('aria-label')).toBe('部分选中')
  })

  it('exposes description via aria-describedby instead of name', () => {
    const { container } = render(<Checkbox description="副文案说明">主文案</Checkbox>)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const desc = container.querySelector('.yakit-checkbox-description')
    if (!input || !desc) throw new Error('expected input and description')

    expect(input.getAttribute('aria-describedby')).toBe(desc.id)
    expect(input.getAttribute('aria-labelledby')).toBeTruthy()
  })

  it('uses aria-labelledby (not describedby) for description-only', () => {
    const { container } = render(<Checkbox description="仅副文案" />)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const desc = container.querySelector('.yakit-checkbox-description')
    if (!input || !desc) throw new Error('expected input and description')

    expect(input.getAttribute('aria-labelledby')).toBe(desc.id)
    expect(input.getAttribute('aria-describedby')).toBeNull()
  })

  it('preserves consumer aria-describedby over generated description id', () => {
    const { container } = render(
      <Checkbox description="副文案" aria-describedby="external-desc">
        主文案
      </Checkbox>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    expect(input.getAttribute('aria-describedby')).toBe('external-desc')
  })

  it('links description via aria-describedby when name comes from explicit aria-labelledby', () => {
    // 无 children 时名称已由外部 ID 提供，副文案应作为描述关联，而非再次参与名称
    const { container } = render(<Checkbox description="副文案说明" aria-labelledby="external-label-id" />)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const desc = container.querySelector('.yakit-checkbox-description')
    if (!input || !desc) throw new Error('expected input and description')

    expect(input.getAttribute('aria-labelledby')).toBe('external-label-id')
    expect(input.getAttribute('aria-describedby')).toBe(desc.id)
  })

  it('preserves consumer aria-labelledby over generated label id', () => {
    const { container } = render(<Checkbox aria-labelledby="external-label">主文案</Checkbox>)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    expect(input.getAttribute('aria-labelledby')).toBe('external-label')
  })

  it('falls back to generated ids when no consumer aria overrides', () => {
    const { container } = render(<Checkbox description="副文案">主文案</Checkbox>)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const desc = container.querySelector('.yakit-checkbox-description')
    if (!input || !desc) throw new Error('expected input and description')

    expect(input.getAttribute('aria-describedby')).toBe(desc.id)
    expect(input.getAttribute('aria-labelledby')).toBeTruthy()
  })

  it('includes value on change event target', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Checkbox value="apple" onChange={onChange}>
        Apple
      </Checkbox>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    flushSync(() => input.click())

    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0].target).toMatchObject({ checked: true, value: 'apple' })
  })

  it('honors preventDefault and does not toggle uncontrolled state', () => {
    const { container } = render(
      <Checkbox
        defaultChecked={false}
        onChange={(e) => {
          e.preventDefault()
        }}
      >
        veto
      </Checkbox>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    flushSync(() => input.click())
    expect(input.checked).toBe(false)
  })

  it('restores uncontrolled checked on form reset', () => {
    const { container } = render(
      <form>
        <Checkbox defaultChecked name="agree">
          同意
        </Checkbox>
      </form>,
    )
    const form = container.querySelector('form')
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!form || !input) throw new Error('expected form and input')

    expect(input.checked).toBe(true)
    flushSync(() => input.click())
    expect(input.checked).toBe(false)
    flushSync(() => form.reset())
    expect(input.checked).toBe(true)
  })

  it('exposes target.checked for antd Form getValueFromEvent(valuePropName=checked)', () => {
    // 对齐 @rc-component/form：defaultGetValueFromEvent(valuePropName, event)
    const defaultGetValueFromEvent = (valuePropName: string, event: { target?: Record<string, unknown> }) => {
      if (event && event.target && typeof event.target === 'object' && valuePropName in event.target) {
        return event.target[valuePropName]
      }
      return event
    }

    const onChange = vi.fn()
    const { container } = render(<Checkbox onChange={onChange}>同意</Checkbox>)
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    flushSync(() => input.click())
    expect(onChange).toHaveBeenCalled()
    const event = onChange.mock.calls[0][0]
    expect(event.target.type).toBe('checkbox')
    expect(defaultGetValueFromEvent('checked', event)).toBe(true)
  })
})

describe('Checkbox.Group behavior', () => {
  it('exposes role=group', () => {
    const { container } = render(
      <Checkbox.Group aria-label="水果">
        <Checkbox value="a">A</Checkbox>
      </Checkbox.Group>,
    )
    const group = container.querySelector('.yakit-checkbox-group')
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-label')).toBe('水果')
  })

  it('keeps rapid uncontrolled toggles without dropping values', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Checkbox.Group defaultValue={[]} onChange={onChange}>
        <Checkbox value="a">A</Checkbox>
        <Checkbox value="b">B</Checkbox>
      </Checkbox.Group>,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs.length).toBe(2)

    flushSync(() => {
      inputs[0].click()
      inputs[1].click()
    })

    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)?.[0] as string[]
    expect(last).toEqual(expect.arrayContaining(['a', 'b']))
    expect(last).toHaveLength(2)
  })

  it('keeps child without value independent of group', () => {
    const onGroup = vi.fn()
    const onStandalone = vi.fn()
    const { container } = render(
      <Checkbox.Group defaultValue={['a']} onChange={onGroup}>
        <Checkbox value="a">A</Checkbox>
        <Checkbox onChange={onStandalone}>独立</Checkbox>
      </Checkbox.Group>,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    flushSync(() => inputs[1].click())

    expect(onStandalone).toHaveBeenCalled()
    expect(onGroup).not.toHaveBeenCalled()
  })

  it('injects checked for Fragment-wrapped valued children', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Checkbox.Group defaultValue={['a']} onChange={onChange}>
        <Fragment>
          <Checkbox value="a">A</Checkbox>
          <Checkbox value="b">B</Checkbox>
        </Fragment>
      </Checkbox.Group>,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs.length).toBe(2)
    expect(inputs[0].checked).toBe(true)
    expect(inputs[1].checked).toBe(false)

    flushSync(() => inputs[1].click())
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)?.[0] as string[]
    expect(last).toEqual(expect.arrayContaining(['a', 'b']))
    expect(last).toHaveLength(2)
  })

  it('does not inject checked into non-Checkbox children with value prop', () => {
    // 间谍组件：回显是否被注入了 checked（修复前任何带 value 的元素都会被 cloneElement 注入）
    const ForeignValueChild = (props: { value: string; checked?: boolean }) => (
      <span data-testid="foreign" data-checked={props.checked === undefined ? 'no' : 'yes'} />
    )

    const { container } = render(
      <Checkbox.Group defaultValue={['a']}>
        <Checkbox value="a">A</Checkbox>
        <ForeignValueChild value="a" />
      </Checkbox.Group>,
    )
    const foreign = container.querySelector<HTMLElement>('[data-testid="foreign"]')
    if (!foreign) throw new Error('expected foreign child')
    expect(foreign.getAttribute('data-checked')).toBe('no')

    // Checkbox 子项的注入照常：1 个 checkbox，选中态来自 Group
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].checked).toBe(true)
  })

  it('degrades deeply wrapped valued children to standalone and warns in dev', () => {
    const warnings: string[] = []
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    })
    const onGroup = vi.fn()
    const onDeep = vi.fn()

    const { container } = render(
      <Checkbox.Group defaultValue={['a']} onChange={onGroup}>
        <Checkbox value="a">A</Checkbox>
        <div>
          <Checkbox value="deep" onChange={onDeep}>
            深层包装
          </Checkbox>
        </div>
      </Checkbox.Group>,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs).toHaveLength(2)
    // 直接子项组控照常
    expect(inputs[0].checked).toBe(true)

    // 深层包装项退化为独立 Checkbox：视觉自管，点击不写组值
    expect(inputs[1].checked).toBe(false)
    flushSync(() => inputs[1].click())
    expect(inputs[1].checked).toBe(true)
    expect(onDeep).toHaveBeenCalledTimes(1)
    expect(onGroup).not.toHaveBeenCalled()

    // dev 警告引导改写法
    expect(warnings.some((w) => w.includes('Checkbox.Group'))).toBe(true)
    spy.mockRestore()
  })

  it('controlled Group ignores onChange no-op without drifting valueRef', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Checkbox.Group value={[]} onChange={onChange}>
        <Checkbox value="a">A</Checkbox>
      </Checkbox.Group>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected checkbox input')

    expect(input.checked).toBe(false)

    flushSync(() => input.click())
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual(['a'])
    // 父组件忽略 onChange → value 仍为 []；UI 保持未选
    expect(input.checked).toBe(false)

    flushSync(() => input.click())
    expect(onChange).toHaveBeenCalledTimes(2)
    // 第二次点击仍按 valueProp=[] 走「添加」，不会因 valueRef 漂移变成取消选中
    expect(onChange.mock.calls[1][0]).toEqual(['a'])
    expect(input.checked).toBe(false)
  })
  it('controlled sequential toggles keep both values when parent updates', () => {
    // 受控模式以 props value 为准；父组件每次 onChange 写回后，下一次 click 才能累加
    const onChange = vi.fn()
    function Controlled() {
      const [value, setValue] = useState<Array<string | number | boolean>>([])
      return (
        <Checkbox.Group
          options={[
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ]}
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }

    const { container } = render(<Controlled />)
    const inputs = () => container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')

    flushSync(() => inputs()[0].click())
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual(['a'])

    flushSync(() => inputs()[1].click())
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange.mock.calls[1][0]).toEqual(['a', 'b'])
    expect(inputs()[0].checked).toBe(true)
    expect(inputs()[1].checked).toBe(true)
  })

  it('renders mixed-type options without duplicate keys and correct checked states', () => {
    // 1 / '1'、true / 'true' 是合法组合，String() key 会碰撞导致协调错乱
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })

    const opts: Array<{ label: string; value: string | number | boolean }> = [
      { label: 'one-num', value: 1 },
      { label: 'one-str', value: '1' },
      { label: 'yes-bool', value: true },
      { label: 'yes-str', value: 'true' },
    ]
    const group = (value: Array<string | number | boolean>) => (
      <Checkbox.Group options={opts} value={value} onChange={() => {}} />
    )
    const { container, root } = render(group([1]))
    const labelOf = () => [...container.querySelectorAll('.yakit-checkbox-label')].map((n) => n.textContent)
    const inputs = () => [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]

    expect(labelOf()).toEqual(['one-num', 'one-str', 'yes-bool', 'yes-str'])
    // 仅数值 1 选中：'1' / true / 'true' 不受影响
    expect(inputs().map((i) => i.checked)).toEqual([true, false, false, false])

    // 重排（boolean 移到最前）后仍恰好 4 项、顺序与选中态正确
    flushSync(() =>
      root.render(<Checkbox.Group options={[opts[2], opts[0], opts[1], opts[3]]} value={[1]} onChange={() => {}} />),
    )
    expect(labelOf()).toEqual(['yes-bool', 'one-num', 'one-str', 'yes-str'])
    expect(inputs().map((i) => i.checked)).toEqual([false, true, false, false])

    expect(errors.filter((e) => e.includes('same key'))).toEqual([])
    spy.mockRestore()
  })
})
