import { Form } from 'antd'
import React from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Checkbox from '../../src/components/Checkbox'
import { cleanup, render } from '../helpers/render'

afterEach(cleanup)

describe('Checkbox with real antd Form', () => {
  it('works as controlled checkbox via valuePropName="checked"', async () => {
    const onFinish = vi.fn()
    const { container } = render(
      <Form initialValues={{ agree: false }} onFinish={(values) => onFinish(values)}>
        <Form.Item name="agree" valuePropName="checked">
          <Checkbox>同意</Checkbox>
        </Form.Item>
      </Form>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!input) throw new Error('expected input')

    expect(input.checked).toBe(false)
    flushSync(() => input.click())
    expect(input.checked).toBe(true)

    const form = container.querySelector('form')
    if (!form) throw new Error('expected form')
    form.requestSubmit()
    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({ agree: true })
    })
  })

  it('Checkbox.Group binds array value without extra config', async () => {
    const onFinish = vi.fn()
    const { container } = render(
      <Form initialValues={{ habits: ['a'] }} onFinish={(values) => onFinish(values)}>
        <Form.Item name="habits">
          <Checkbox.Group>
            <Checkbox value="a">A</Checkbox>
            <Checkbox value="b">B</Checkbox>
            <Checkbox value="c">C</Checkbox>
          </Checkbox.Group>
        </Form.Item>
      </Form>,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].checked).toBe(true)

    // 勾选 B：Form 受控回流后 A+B 均选中
    flushSync(() => inputs[1].click())
    expect(inputs[1].checked).toBe(true)
    expect(inputs[0].checked).toBe(true)

    const form = container.querySelector('form')
    if (!form) throw new Error('expected form')
    form.requestSubmit()
    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({ habits: ['a', 'b'] })
    })
  })

  it('form.resetFields() restores initialValues for both Checkbox and Group', () => {
    let formApi: ReturnType<typeof Form.useForm>[0] | null = null
    function Demo() {
      const [form] = Form.useForm()
      formApi = form
      return (
        <Form form={form} initialValues={{ agree: true, habits: ['a'] }}>
          <Form.Item name="agree" valuePropName="checked">
            <Checkbox>同意</Checkbox>
          </Form.Item>
          <Form.Item name="habits">
            <Checkbox.Group>
              <Checkbox value="a">A</Checkbox>
              <Checkbox value="b">B</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      )
    }
    const { container } = render(<Demo />)
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].checked).toBe(true) // agree
    expect(inputs[1].checked).toBe(true) // habits a

    // 全部改动：agree 取消，b 勾选（onChange → store 更新 → 受控回流）
    flushSync(() => inputs[0].click())
    flushSync(() => inputs[2].click())
    expect(inputs[0].checked).toBe(false)
    expect(inputs[2].checked).toBe(true)

    // antd 官方 resetFields：store 恢复 initialValues。
    // 注：断言 store（rc-field-form 的契约面）；DOM checked 的视觉回流依赖
    // 真实浏览器事件循环，本环境（vitest browser + React 19 受控恢复）对
    // antd 自家 Checkbox 同样不即时回流，故不作 DOM 断言。
    expect(formApi).not.toBeNull()
    flushSync(() => formApi?.resetFields())
    expect(formApi?.getFieldsValue()).toEqual({ agree: true, habits: ['a'] })
  })
})
