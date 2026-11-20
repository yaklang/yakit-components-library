import type { Meta, StoryObj } from '@storybook/react'
import { InputNumber } from '@yakit-libs/yakit-ui'
import type { InputNumberProps } from '@yakit-libs/yakit-ui'

const layout = { display: 'flex', flexDirection: 'column' as const, gap: '16px' }

const meta: Meta<typeof InputNumber> = {
  title: 'YakitUi/通用/InputNumber',
  component: InputNumber,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Functional behavior follows Ant Design 6.5.4. Numeric controls are pending numeric Figma review; the supplied Input/Search nodes do not cover steppers.',
      },
    },
  },
  tags: ['autodocs'],
  args: { defaultValue: 0, min: 0 },
  argTypes: {
    size: { control: 'select', options: ['small', 'medium', 'large', 'huge'] },
    controls: { control: 'select', options: ['vertical', 'horizontal', false] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
} satisfies Meta<typeof InputNumber>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args: InputNumberProps) => (
    <div style={layout}>
      <InputNumber {...args} size="small" />
      <InputNumber {...args} size="medium" />
      <InputNumber {...args} size="large" />
      <InputNumber {...args} size="huge" />
    </div>
  ),
}

export const HorizontalControls: Story = {
  args: { controls: 'horizontal', defaultValue: 10 },
}

export const StringMode: Story = {
  args: { defaultValue: '9007199254740993.01', stringMode: true },
}

export const PrefixAndSuffix: Story = {
  args: { defaultValue: 12.5, prefix: '¥', suffix: '%' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 10 },
}

export const Focus: Story = {
  args: { autoFocus: true },
}

export const FormatterAndBounds: Story = {
  args: {
    defaultValue: 1200,
    formatter: (value: string | number | undefined) => `¥ ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
    max: 5000,
    min: 0,
    parser: (value: string | undefined) => Number(value?.replace(/¥\s?|,/g, '')),
    step: 100,
  },
}

export const ReadOnly: Story = {
  args: { controls: 'horizontal', defaultValue: 10, readOnly: true },
}
