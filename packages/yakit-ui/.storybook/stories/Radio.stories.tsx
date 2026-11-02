import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';

import Radio, { YakitRadioButtons } from '../../src/components/Radio';
import type { RadioProps, RadioRef, RadioValue } from '../../src/components/Radio';

const meta: Meta<typeof Radio> = {
  title: 'YakitUi/通用/Radio',
  component: Radio,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '尺寸：medium→md-16，large→lg-20；middle 兼容别名',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['medium', 'large', 'middle'],
    },
    checked: {
      description: '是否选中（受控）',
      control: { type: 'boolean' },
    },
    defaultChecked: {
      description: '默认是否选中',
      control: { type: 'boolean' },
    },
    disabled: {
      description: '是否禁用',
      control: { type: 'boolean' },
    },
    label: {
      description: '主文案',
      control: 'text',
    },
    description: {
      description: '副文案',
      control: 'text',
    },
    children: {
      description: '子节点（作 label）',
      control: 'text',
    },
    onChange: { action: 'changed' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '24px',
  flexWrap: 'wrap' as const,
};

const col = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

export const Default: Story = {
  args: {
    children: 'Radio',
    defaultChecked: false,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Radio size="medium" defaultChecked>
        Medium (md-16)
      </Radio>
      <Radio size="large" defaultChecked>
        Large (lg-20)
      </Radio>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={col}>
      <div style={row}>
        <Radio>Empty Primary</Radio>
        <Radio defaultChecked>Selected Primary</Radio>
      </div>
      <div style={row}>
        <Radio disabled>Empty Disable</Radio>
        <Radio disabled defaultChecked>
          Selected Disable
        </Radio>
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div style={row}>
      <Radio size="medium" label="Radio button" />
      <Radio size="large" label="Radio button" defaultChecked />
      <Radio size="medium" label="Radio button" disabled />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div style={row}>
      <Radio size="medium" label="Radio button" description="Used for selecting only one option" />
      <Radio
        size="large"
        label="Radio button"
        description="Used for selecting only one option"
        defaultChecked
      />
      <Radio
        size="medium"
        label="Radio button"
        description="Used for selecting only one option"
        disabled
      />
    </div>
  ),
};

export const Group: Story = {
  render: function GroupStory() {
    const [value, setValue] = useState<RadioValue | undefined>('a');
    return (
      <div style={col}>
        <div style={{ color: '#868c97', fontSize: 12 }}>默认横排</div>
        <Radio.Group value={value} onChange={(e) => setValue(e.target.value)} name="demo-group">
          <Radio value="a">Option A</Radio>
          <Radio value="b">Option B</Radio>
          <Radio value="c" disabled>
            Option C (disabled)
          </Radio>
        </Radio.Group>
        <div style={{ color: '#868c97', fontSize: 12 }}>当前值：{String(value)}</div>
      </div>
    );
  },
};

export const GroupVertical: Story = {
  render: function GroupVerticalStory() {
    const [value, setValue] = useState<RadioValue | undefined>('a');
    return (
      <Radio.Group
        vertical
        value={value}
        onChange={(e) => setValue(e.target.value)}
        name="demo-vertical"
      >
        <Radio value="a">Option A</Radio>
        <Radio value="b">Option B</Radio>
        <Radio value="c">Option C</Radio>
      </Radio.Group>
    );
  },
};

export const Options: Story = {
  render: function OptionsStory() {
    const [value, setValue] = useState<RadioValue | undefined>('apple');
    return (
      <Radio.Group
        value={value}
        onChange={(e) => setValue(e.target.value)}
        options={[
          { label: 'Apple', value: 'apple', description: 'Fruit' },
          { label: 'Orange', value: 'orange' },
          { label: 'Banana', value: 'banana', disabled: true },
        ]}
      />
    );
  },
};

export const ButtonOutline: Story = {
  name: 'Button / outline',
  render: function ButtonOutlineStory() {
    const [btn, setBtn] = useState<RadioValue | undefined>('day');
    return (
      <div style={col}>
        <Radio.Group
          optionType="button"
          buttonStyle="outline"
          value={btn}
          onChange={(e) => setBtn(e.target.value)}
          options={['day', 'week', 'month']}
          size="middle"
        />
        <div style={{ color: '#868c97', fontSize: 12 }}>当前值：{String(btn)}</div>
      </div>
    );
  },
};

export const ButtonSolid: Story = {
  name: 'Button / solid',
  render: function ButtonSolidStory() {
    const [btn, setBtn] = useState<RadioValue | undefined>('day');
    return (
      <div style={col}>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={btn}
          onChange={(e) => setBtn(e.target.value)}
          options={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
          ]}
        />
        <YakitRadioButtons
          buttonStyle="solid"
          size="small"
          value={btn}
          onChange={(e) => setBtn(e.target.value)}
          options={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
          ]}
          wrapClassName="demo-wrap"
        />
      </div>
    );
  },
};

export const ButtonSizes: Story = {
  name: 'Button / sizes',
  render: function ButtonSizesStory() {
    const [v, setV] = useState<RadioValue | undefined>('a');
    const opts = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ];
    const onChange = (e: { target: { value: RadioValue | undefined } }) => setV(e.target.value);
    return (
      <div style={col}>
        <div style={row}>
          <span style={{ width: 72, fontSize: 12, color: '#868c97' }}>small</span>
          <YakitRadioButtons
            size="small"
            buttonStyle="solid"
            value={v}
            onChange={onChange}
            options={opts}
          />
        </div>
        <div style={row}>
          <span style={{ width: 72, fontSize: 12, color: '#868c97' }}>middle</span>
          <YakitRadioButtons
            size="middle"
            buttonStyle="solid"
            value={v}
            onChange={onChange}
            options={opts}
          />
        </div>
        <div style={row}>
          <span style={{ width: 72, fontSize: 12, color: '#868c97' }}>large</span>
          <YakitRadioButtons
            size="large"
            buttonStyle="solid"
            value={v}
            onChange={onChange}
            options={opts}
          />
        </div>
        <div style={row}>
          <span style={{ width: 72, fontSize: 12, color: '#868c97' }}>maxLarge</span>
          <YakitRadioButtons
            size="maxLarge"
            buttonStyle="solid"
            value={v}
            onChange={onChange}
            options={opts}
          />
        </div>
        <div style={row}>
          <span style={{ width: 72, fontSize: 12, color: '#868c97' }}>outline</span>
          <YakitRadioButtons
            size="middle"
            buttonStyle="outline"
            value={v}
            onChange={onChange}
            options={opts}
          />
        </div>
      </div>
    );
  },
};

export const RadioButtonChildren: Story = {
  name: 'Radio.Button children',
  render: function RadioButtonStory() {
    const [v, setV] = useState<RadioValue | undefined>('a');
    return (
      <div style={col}>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          size="middle"
          value={v}
          onChange={(e) => setV(e.target.value)}
        >
          <Radio.Button value="a">Hangzhou</Radio.Button>
          <Radio.Button value="b">Shanghai</Radio.Button>
          <Radio.Button value="c" disabled>
            Beijing
          </Radio.Button>
        </Radio.Group>
        <Radio.Group
          optionType="button"
          buttonStyle="outline"
          size="small"
          value={v}
          onChange={(e) => setV(e.target.value)}
        >
          <Radio.Button value="a">A</Radio.Button>
          <Radio.Button value="b">B</Radio.Button>
          <Radio.Button value="c">C</Radio.Button>
        </Radio.Group>
        <div style={{ color: '#868c97', fontSize: 12 }}>
          DOM 含 ant-radio-group / ant-radio-button-wrapper；当前值：{String(v)}
        </div>
      </div>
    );
  },
};

export const AntClassCompat: Story = {
  name: 'ant-radio-* class 兼容',
  render: () => (
    <div style={col}>
      <Radio defaultChecked className="demo-circular">
        圆形（含 ant-radio-wrapper / ant-radio / ant-radio-inner）
      </Radio>
      <Radio.Group
        optionType="button"
        buttonStyle="solid"
        defaultValue="1"
        options={['1', '2', '3']}
      />
      <p style={{ fontSize: 12, color: '#868c97', maxWidth: 420 }}>
        检查 DOM：根为 ant-radio-group ant-radio-group-solid；项为 ant-radio-button-wrapper /
        ant-radio-button-wrapper-checked。主项目 :global(.ant-radio-*) 可继续命中。
      </p>
    </div>
  ),
};
export const OnClickCompat: Story = {
  name: 'onClick（主项目圆形用法）',
  render: function OnClickStory() {
    const [isPrivate, setIsPrivate] = useState(true);
    return (
      <div style={row}>
        <Radio
          checked={isPrivate}
          onClick={() => {
            setIsPrivate(true);
          }}
        >
          私密(仅自己可见)
        </Radio>
        <Radio
          checked={!isPrivate}
          onClick={() => {
            setIsPrivate(false);
          }}
        >
          公开
        </Radio>
      </div>
    );
  },
};

export const ForwardRefFocus: Story = {
  name: 'forwardRef focus/blur',
  render: function RefStory() {
    const ref = useRef<RadioRef>(null);
    return (
      <div style={col}>
        <Radio ref={ref} defaultChecked>
          Focusable Radio
        </Radio>
        <div style={row}>
          <button type="button" onClick={() => ref.current?.focus()}>
            focus
          </button>
          <button type="button" onClick={() => ref.current?.blur()}>
            blur
          </button>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Radio',
    disabled: true,
    defaultChecked: true,
  },
};

export const Controlled: Story = {
  render: function ControlledStory(args: RadioProps) {
    const [checked, setChecked] = useState(false);
    return (
      <Radio {...args} checked={checked} onChange={(e) => setChecked(e.target.checked)}>
        Controlled ({checked ? 'on' : 'off'})
      </Radio>
    );
  },
};

export const BooleanValues: Story = {
  name: 'boolean value',
  render: function BooleanValuesStory() {
    const [value, setValue] = useState<RadioValue | undefined>(true);
    return (
      <div style={col}>
        <Radio.Group
          value={value}
          onChange={(e) => setValue(e.target.value)}
          name="demo-boolean"
          aria-label="boolean-demo"
        >
          <Radio value={true}>True</Radio>
          <Radio value={false}>False</Radio>
        </Radio.Group>
        <div style={{ color: '#868c97', fontSize: 12 }}>
          当前值：{String(value)}（typeof {typeof value}）
        </div>
      </div>
    );
  },
};

export const AriaAndWrap: Story = {
  name: 'aria + wrapClassName',
  render: function AriaWrapStory() {
    const [v, setV] = useState<RadioValue | undefined>('a');
    return (
      <div style={col}>
        <div id="radio-group-heading">外链标题</div>
        <YakitRadioButtons
          aria-labelledby="radio-group-heading"
          wrapClassName="demo-aria-wrap"
          buttonStyle="outline"
          size="middle"
          value={v}
          onChange={(e) => setV(e.target.value)}
          options={[
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ]}
        />
        <Radio.Group
          aria-label="显式 aria-label"
          name="should-not-override-aria"
          value={v}
          onChange={(e) => setV(e.target.value)}
        >
          <Radio value="a">A</Radio>
          <Radio value="b">B</Radio>
        </Radio.Group>
      </div>
    );
  },
};
