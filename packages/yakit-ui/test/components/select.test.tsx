import { userEvent } from '@vitest/browser/context'
import React, { useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ConfigProvider from '../../src/components/ConfigProvider'
import Select from '../../src/components/Select'

const roots: Root[] = []
const options = [
  { value: 'apple', label: '苹果' },
  { value: 'pear', label: '梨' },
]

const render = (node: React.ReactNode) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  flushSync(() => root.render(node))
  return container
}

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
})

const fieldOf = (container: HTMLElement) => {
  const field = container.querySelector<HTMLElement>('.yakit-select')
  if (!field) throw new Error('expected select')
  return field
}

describe('Select', () => {
  it('uses the design heights and defaults to medium', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const small = fieldOf(render(<Select size="small" options={options} />))
    const medium = fieldOf(render(<Select options={options} />))
    const large = fieldOf(render(<Select size="large" options={options} />))

    expect(small.closest('.yakit-select')?.classList.contains('yakit-select-small')).toBe(true)
    expect(medium.closest('.yakit-select')?.classList.contains('yakit-select-medium')).toBe(true)
    expect(large.closest('.yakit-select')?.classList.contains('yakit-select-large')).toBe(true)
    expect(getComputedStyle(small).height).toBe('24px')
    expect(getComputedStyle(small).paddingLeft).toBe('8px')
    expect(getComputedStyle(small).paddingRight).toBe('8px')
    expect(getComputedStyle(small).fontSize).toBe('12px')
    expect(getComputedStyle(small).lineHeight).toBe('16px')
    expect(getComputedStyle(small).letterSpacing).toBe('0.5px')
    expect(getComputedStyle(medium).height).toBe('28px')
    expect(getComputedStyle(medium).paddingLeft).toBe('12px')
    expect(getComputedStyle(medium).fontSize).toBe('12px')
    expect(getComputedStyle(medium).lineHeight).toBe('16px')
    expect(getComputedStyle(medium).letterSpacing).toBe('0.5px')
    expect(getComputedStyle(large).height).toBe('32px')
    expect(getComputedStyle(large).paddingLeft).toBe('12px')
    expect(getComputedStyle(large).fontSize).toBe('14px')
    expect(getComputedStyle(large).lineHeight).toBe('20px')
    expect(getComputedStyle(large).letterSpacing).toBe('0.1px')
    expect(getComputedStyle(small.querySelector('.ant-select-suffix svg')!).width).toBe('12px')
  })

  it('uses the disabled field colors from the design', () => {
    const expectDisabled = (
      field: HTMLElement,
      height: string,
      padding: string,
      fontSize: string,
      lineHeight: string,
      tracking: string,
    ) => {
      const text = field.querySelector<HTMLElement>('.ant-select-content')
      const suffix = field.querySelector<HTMLElement>('.ant-select-suffix')
      const style = getComputedStyle(field)

      expect(style.height).toBe(height)
      expect(style.paddingLeft).toBe(padding)
      expect(style.backgroundColor).toBe('rgb(238, 240, 243)')
      expect(style.borderTopColor).toBe('rgb(230, 232, 237)')
      expect(style.borderRadius).toBe('4px')
      expect(text && getComputedStyle(text).color).toBe('rgb(192, 198, 209)')
      expect(text && getComputedStyle(text).fontSize).toBe(fontSize)
      expect(text && getComputedStyle(text).lineHeight).toBe(lineHeight)
      expect(text && getComputedStyle(text).letterSpacing).toBe(tracking)
      expect(suffix && getComputedStyle(suffix).color).toBe('rgb(192, 198, 209)')
      expect(suffix && getComputedStyle(suffix.querySelector('svg')!).color).toBe('rgb(192, 198, 209)')
      expect(suffix && getComputedStyle(suffix.querySelector('svg')!).width).toBe('12px')
    }

    expectDisabled(
      fieldOf(render(<Select disabled options={options} size="small" />)),
      '24px',
      '8px',
      '12px',
      '16px',
      '0.5px',
    )
    expectDisabled(
      fieldOf(render(<Select disabled defaultValue="apple" options={options} />)),
      '28px',
      '12px',
      '12px',
      '16px',
      '0.5px',
    )
    expectDisabled(
      fieldOf(render(<Select disabled defaultValue="apple" options={options} size="large" />)),
      '32px',
      '12px',
      '14px',
      '20px',
      '0.1px',
    )
  })

  it('matches the three dropdown item sizes', async () => {
    const menuOptions = [
      { value: 'a', label: 'Select list item 1' },
      { value: 'b', label: 'Select list item 5', disabled: true },
    ]
    render(<Select open size="small" options={menuOptions} onOptionDelete={() => undefined} />)
    render(<Select open size="medium" options={menuOptions} onOptionDelete={() => undefined} />)
    render(<Select open size="large" options={menuOptions} onOptionDelete={() => undefined} />)

    const itemOf = (size: string, disabled = false) => {
      const menu = document.querySelector(`.yakit-select-dropdown-${size}`)
      const item = menu?.querySelector<HTMLElement>(
        disabled ? '.ant-select-item-option-disabled' : '.ant-select-item-option:not(.ant-select-item-option-disabled)',
      )
      if (!menu || !item) throw new Error(`expected ${size} option`)
      return { menu, item }
    }
    const expectItem = (size: string, height: string, fontSize: string, lineHeight: string, tracking: string) => {
      const { menu, item } = itemOf(size)
      const menuStyle = getComputedStyle(menu)
      const style = getComputedStyle(item)
      const disabled = getComputedStyle(itemOf(size, true).item)

      expect(menuStyle.paddingTop).toBe('8px')
      expect(menuStyle.paddingLeft).toBe('4px')
      expect(style.height).toBe(height)
      expect(style.paddingLeft).toBe('8px')
      expect(style.paddingRight).toBe('8px')
      expect(style.fontSize).toBe(fontSize)
      expect(style.lineHeight).toBe(lineHeight)
      expect(style.letterSpacing).toBe(tracking)
      expect(style.fontWeight).toBe('400')
      expect(style.borderRadius).toBe('4px')
      expect(style.color).toBe('rgb(53, 54, 57)')
      expect(disabled.color).toBe('rgb(192, 198, 209)')
    }

    expectItem('small', '28px', '12px', '16px', '0.5px')
    expectItem('medium', '28px', '12px', '16px', '0.5px')
    expectItem('large', '32px', '14px', '20px', '0.1px')

    const hovered = itemOf('small').item
    await userEvent.hover(hovered)
    await expect.poll(() => getComputedStyle(hovered).backgroundColor).toBe('rgb(238, 240, 243)')
  })

  it('uses the design status colors', async () => {
    const error = fieldOf(render(<Select options={options} status="error" />))
    const warning = fieldOf(render(<Select options={options} status="warning" />))
    const filled = fieldOf(render(<Select options={options} status="error" variant="filled" />))
    const underlined = fieldOf(render(<Select options={options} status="error" variant="underlined" />))

    expect(getComputedStyle(error).borderTopColor).toBe('rgb(248, 171, 171)')
    expect(getComputedStyle(warning).borderTopColor).toBe('rgb(251, 211, 145)')
    expect(getComputedStyle(filled).backgroundColor).toBe('rgb(248, 249, 250)')
    expect(getComputedStyle(filled).borderTopColor).toBe('rgb(248, 171, 171)')
    expect(getComputedStyle(underlined).borderTopColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(underlined).borderBottomColor).toBe('rgb(248, 171, 171)')

    await userEvent.hover(underlined)
    await expect.poll(() => getComputedStyle(underlined).borderTopColor).toBe('rgba(0, 0, 0, 0)')
    await expect.poll(() => getComputedStyle(underlined).borderBottomColor).toBe('rgb(241, 87, 87)')

    await userEvent.click(error)
    await expect.poll(() => getComputedStyle(error).borderTopColor).toBe('rgb(241, 87, 87)')
    await expect.poll(() => getComputedStyle(error).boxShadow).toBe('rgb(252, 218, 218) 0px 0px 0px 2px')
  })

  it('keeps group titles and empty text out of the option title color', () => {
    render(<Select open options={[{ label: '水果', options: [{ value: 'apple', label: '苹果' }] }]} />)
    render(<Select open options={[]} />)

    const group = document.querySelector<HTMLElement>('.ant-select-item-group')
    const empty = document.querySelector<HTMLElement>('.ant-select-item-empty')

    expect(group && getComputedStyle(group).color).toBe('rgb(134, 140, 151)')
    expect(empty && getComputedStyle(empty).color).toBe('rgb(192, 198, 209)')
  })

  it('keeps clear and arrow opt-in', () => {
    const plain = render(<Select options={options} />)
    const cleared = render(<Select allowClear defaultValue="apple" options={options} />)
    const noArrow = render(<Select suffixIcon={null} options={options} />)

    expect(plain.querySelector('.ant-select-clear')).toBeNull()
    expect(cleared.querySelector('.ant-select-clear')).not.toBeNull()
    expect(cleared.querySelector('.ant-select-clear svg path')?.getAttribute('fill')).toBe('currentColor')
    expect(getComputedStyle(cleared.querySelector('.ant-select-clear svg')!).width).toBe('14px')
    expect(plain.querySelector('.ant-select-suffix')).not.toBeNull()
    expect(noArrow.querySelector('.ant-select-suffix')).toBeNull()

    const placed = fieldOf(render(<Select allowClear defaultValue="apple" size="small" options={options} />))
    const arrow = fieldOf(render(<Select size="small" options={options} />))
    const clearIcon = placed.querySelector('.ant-select-clear')!
    const arrowIcon = arrow.querySelector('.ant-select-suffix')!
    const clearBox = clearIcon.getBoundingClientRect()
    const arrowBox = arrowIcon.getBoundingClientRect()
    const fieldBox = placed.getBoundingClientRect()
    const arrowField = arrow.getBoundingClientRect()
    expect(Math.abs(clearBox.right - (fieldBox.right - (arrowField.right - arrowBox.right)))).toBeLessThan(1)
    expect(Math.abs(clearBox.top + clearBox.height / 2 - (fieldBox.top + fieldBox.height / 2))).toBeLessThan(1)
    expect(clearBox.width).toBe(14)
  })

  it('keeps the arrow until hover, then swaps in the clear icon', async () => {
    const field = fieldOf(render(<Select allowClear defaultValue="apple" options={options} />))
    const clear = field.querySelector<HTMLElement>('.ant-select-clear')
    const suffix = field.querySelector<HTMLElement>('.ant-select-suffix')

    expect(clear && getComputedStyle(clear).opacity).toBe('0')
    expect(suffix && getComputedStyle(suffix).opacity).toBe('1')

    await userEvent.hover(field)

    await expect.poll(() => clear && getComputedStyle(clear).opacity).toBe('1')
    await expect.poll(() => suffix && getComputedStyle(suffix).opacity).toBe('0')
  })

  it('keeps the antd check until checkbox is set', () => {
    render(<Select open mode="multiple" defaultValue={['apple']} options={options} />)
    render(<Select open checkbox mode="multiple" defaultValue={['apple']} options={options} />)
    render(<Select open checkbox defaultValue="apple" options={options} />)
    render(<Select open defaultValue="apple" mode="tags" options={options} />)
    render(
      <Select
        open
        checkbox
        mode="multiple"
        options={options}
        optionRender={(option) => <span className="custom-option">{option.label}</span>}
      />,
    )

    const dropdowns = document.querySelectorAll('.yakit-select-dropdown')
    const selectedMark = (dropdown: Element) =>
      dropdown.querySelector('.ant-select-item-option-selected .ant-select-item-option-state')
    const projectCheck = (dropdown: Element) => selectedMark(dropdown)?.querySelector('.yakit-icon')

    expect(dropdowns[0].querySelector('.yakit-select-option-check')).toBeNull()
    expect(projectCheck(dropdowns[0])).not.toBeNull()
    expect(projectCheck(dropdowns[0]) && getComputedStyle(projectCheck(dropdowns[0])!).color).toBe('rgb(242, 140, 69)')
    expect(dropdowns[1].querySelectorAll('.yakit-select-option-check .yakit-checkbox')).toHaveLength(2)
    expect(dropdowns[1].querySelector('.ant-select-item-option-selected .yakit-checkbox-checked')).not.toBeNull()
    expect(selectedMark(dropdowns[1])?.childElementCount ?? 0).toBe(0)
    expect(dropdowns[2].querySelector('.yakit-select-option-check')).toBeNull()
    expect(projectCheck(dropdowns[2])).toBeNull()
    expect(
      dropdowns[2].querySelector('.ant-select-item-option-selected') &&
        getComputedStyle(dropdowns[2].querySelector('.ant-select-item-option-selected')!).color,
    ).toBe('rgb(242, 140, 69)')
    expect(dropdowns[3].querySelector('.yakit-select-option-check')).toBeNull()
    expect(projectCheck(dropdowns[3])).not.toBeNull()
    expect(dropdowns[4].querySelector('.yakit-select-option-check')).toBeNull()
    expect(dropdowns[4].querySelector('.custom-option')?.textContent).toBe('苹果')
  })

  it('checks the project checkbox and shows a tag when an option is chosen', async () => {
    render(<Select open checkbox mode="multiple" options={options} />)
    const pear = [...document.querySelectorAll<HTMLElement>('.ant-select-item-option')].find((item) =>
      item.textContent?.includes('梨'),
    )
    if (!pear) throw new Error('expected pear')

    await userEvent.click(pear)

    await expect
      .poll(() => document.querySelector('.ant-select-item-option-selected .yakit-checkbox-checked'))
      .not.toBeNull()
    expect(document.querySelector('.yakit-select-tag')?.textContent).toContain('梨')
  })

  it('keeps a disabled checkbox unchanged while the pointer is over it', async () => {
    render(
      <Select
        open
        checkbox
        mode="multiple"
        options={[...options, { value: 'disabled', label: '不可选', disabled: true }]}
      />,
    )
    const dropdown = document.querySelector('.yakit-select-dropdown')
    const disabled = dropdown?.querySelector<HTMLElement>('.ant-select-item-option-disabled')
    const disabledBox = disabled?.querySelector<HTMLElement>('.yakit-checkbox-inner')
    const enabled = dropdown?.querySelector<HTMLElement>(
      '.ant-select-item-option:not(.ant-select-item-option-disabled)',
    )
    const enabledBox = enabled?.querySelector<HTMLElement>('.yakit-checkbox-inner')
    if (!disabled || !disabledBox || !enabled || !enabledBox) {
      throw new Error('expected checkbox options')
    }

    await userEvent.hover(disabled)
    expect(getComputedStyle(disabledBox).backgroundColor).toBe('rgb(238, 240, 243)')
    expect(getComputedStyle(disabledBox).borderTopColor).toBe('rgb(230, 232, 237)')

    await userEvent.hover(enabled)
    await expect.poll(() => getComputedStyle(enabledBox).backgroundColor).toBe('rgb(253, 240, 230)')
    await expect.poll(() => getComputedStyle(enabledBox).borderTopColor).toBe('rgb(245, 159, 100)')
  })

  it('reports an option delete without changing the selected value', () => {
    const onOptionDelete = vi.fn()
    const onChange = vi.fn()
    const Harness = () => {
      const [value, setValue] = useState('apple')
      return (
        <Select
          open
          options={options}
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next as string)
          }}
          onOptionDelete={onOptionDelete}
        />
      )
    }
    render(<Harness />)

    const deleteButton = document.querySelector<HTMLButtonElement>(
      '.ant-select-item-option:not(.ant-select-item-option-selected) .yakit-select-option-delete',
    )
    deleteButton?.click()

    expect(onOptionDelete).toHaveBeenCalledWith(expect.objectContaining({ value: 'pear' }))
    expect(onChange).not.toHaveBeenCalled()
    const selected = document.querySelector<HTMLElement>('.ant-select-item-option-selected')
    expect(selected?.textContent).toContain('苹果')
    expect(selected && getComputedStyle(selected).backgroundColor).toBe('rgb(254, 245, 238)')
    expect(selected && getComputedStyle(selected).color).toBe('rgb(242, 140, 69)')
  })

  it('deletes the keyboard-active option with Delete', async () => {
    const onOptionDelete = vi.fn()
    const ref = React.createRef<React.ComponentRef<typeof Select>>()
    render(<Select ref={ref} open defaultValue="apple" options={options} onOptionDelete={onOptionDelete} />)
    const pear = [...document.querySelectorAll<HTMLElement>('.ant-select-item-option')].find((item) =>
      item.textContent?.includes('梨'),
    )
    const button = pear?.querySelector<HTMLElement>('.yakit-select-option-delete')
    if (!pear || !button) throw new Error('expected pear delete button')

    expect(getComputedStyle(button).display).toBe('none')
    ref.current?.focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => getComputedStyle(button).display).not.toBe('none')
    await userEvent.keyboard('{Delete}')

    expect(onOptionDelete).toHaveBeenCalledWith(expect.objectContaining({ value: 'pear' }))
    expect(document.querySelector('.ant-select-content')?.textContent).toContain('苹果')
  })

  it('renders selected values with the project tag', async () => {
    const onChange = vi.fn()
    render(
      <Select mode="multiple" options={options} defaultValue={['apple', 'pear']} maxTagCount={1} onChange={onChange} />,
    )

    const tags = document.querySelectorAll('.yakit-select-tag .yakit-tag')
    expect(tags.length).toBeGreaterThanOrEqual(2)
    expect(tags[0]?.textContent).toContain('苹果')
    expect(tags[0]?.querySelector('.yakit-tag-close .yakit-icon')).not.toBeNull()
    expect(document.body.textContent).toContain('+')

    const close = tags[0]?.querySelector('button')
    if (!close) throw new Error('expected tag close')
    await userEvent.click(close)

    expect(onChange).toHaveBeenCalledWith(['pear'], expect.anything())
  })

  it('sizes project tags with the field and skips them in single mode', () => {
    render(<Select mode="tags" size="small" defaultValue={['apple']} options={options} />)
    render(<Select mode="multiple" size="large" defaultValue={['pear']} options={options} />)
    const single = fieldOf(render(<Select defaultValue="apple" options={options} />))
    const disabled = fieldOf(render(<Select disabled mode="multiple" defaultValue={['apple']} options={options} />))

    const tags = [...document.querySelectorAll<HTMLElement>('.yakit-select-tag .yakit-tag')]
    expect(tags[0]).toHaveClass('yakit-tag-small')
    expect(tags[0]?.textContent).toContain('苹果')
    expect(tags[1]).toHaveClass('yakit-tag-large')
    expect(single.querySelector('.yakit-tag')).toBeNull()
    expect(disabled.querySelector('.yakit-tag')).toHaveClass('yakit-tag-disabled', 'yakit-tag-medium')
  })

  it('passes a remove icon node or function through to the project tag', () => {
    render(
      <Select
        mode="multiple"
        defaultValue={['apple']}
        options={options}
        removeIcon={<i className="node-remove">n</i>}
      />,
    )
    render(
      <Select
        mode="multiple"
        defaultValue={['pear']}
        options={options}
        removeIcon={() => <i className="fn-remove">f</i>}
      />,
    )

    expect(document.querySelector('.yakit-tag-close .node-remove')?.textContent).toBe('n')
    expect(document.querySelector('.yakit-tag-close .fn-remove')?.textContent).toBe('f')
  })

  it('keeps caller empty content and tag content', () => {
    render(<Select open options={[]} notFoundContent="没有数据" />)
    render(
      <Select
        mode="multiple"
        options={options}
        defaultValue={['apple']}
        tagRender={() => <em className="caller-tag">自定义</em>}
      />,
    )

    expect(document.body.textContent).toContain('没有数据')
    expect(document.querySelector('.caller-tag')?.textContent).toBe('自定义')
  })

  it('uses YakitSelect border tokens for underlined hover and focus', async () => {
    const field = fieldOf(
      render(
        <ConfigProvider
          theme={{
            components: {
              YakitSelect: {
                hoverBorderColor: 'rgb(255, 0, 0)',
                activeBorderColor: 'rgb(0, 0, 255)',
              },
            },
          }}
        >
          <Select options={options} variant="underlined" />
        </ConfigProvider>,
      ),
    )

    await userEvent.hover(field)
    await expect.poll(() => getComputedStyle(field).borderBottomColor).toBe('rgb(255, 0, 0)')
    expect(getComputedStyle(field).borderTopColor).toBe('rgba(0, 0, 0, 0)')

    await userEvent.click(field)
    await expect.poll(() => getComputedStyle(field).borderBottomColor).toBe('rgb(0, 0, 255)')
    expect(getComputedStyle(field).borderTopColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('uses project select tokens until the provider overrides them', () => {
    render(<Select open defaultValue="apple" options={options} />)
    render(
      <ConfigProvider
        theme={{
          components: {
            YakitSelect: { optionHeight: 40, optionSelectedColor: 'rgb(1, 2, 3)' },
          },
        }}
      >
        <Select open defaultValue="apple" options={options} />
      </ConfigProvider>,
    )

    const [projectItem, customItem] = document.querySelectorAll<HTMLElement>('.ant-select-item-option-selected')

    expect(getComputedStyle(projectItem).height).toBe('28px')
    expect(getComputedStyle(projectItem).color).toBe('rgb(242, 140, 69)')
    expect(getComputedStyle(projectItem).paddingLeft).toBe('8px')
    expect(getComputedStyle(customItem).height).toBe('40px')
    expect(getComputedStyle(customItem).color).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(customItem).paddingLeft).toBe('8px')
  })

  it('uses antd rtl classes when the provider direction is rtl', () => {
    const container = render(
      <ConfigProvider direction="rtl">
        <Select open options={options} />
      </ConfigProvider>,
    )

    expect(fieldOf(container).classList.contains('ant-select-rtl')).toBe(true)
    expect(document.querySelector('.yakit-select-dropdown')?.classList.contains('ant-select-dropdown-rtl')).toBe(true)
  })

  it('treats defaultOpen as initially open for the arrow and popup theme', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const closed = fieldOf(render(<Select options={options} />))
    const opened = fieldOf(render(<Select defaultOpen options={options} />))
    const popup = document.querySelector('.yakit-select-dropdown')

    expect(popup).not.toBeNull()
    expect(popup?.getAttribute('data-theme')).toBe('light')
    expect(opened.querySelector('.ant-select-suffix svg')?.innerHTML).not.toBe(
      closed.querySelector('.ant-select-suffix svg')?.innerHTML,
    )
  })

  it('forwards focus through the ref', () => {
    const ref = React.createRef<React.ComponentRef<typeof Select>>()
    render(<Select ref={ref} options={options} />)
    ref.current?.focus()
    expect(document.activeElement?.closest('.yakit-select')).not.toBeNull()
  })
})
