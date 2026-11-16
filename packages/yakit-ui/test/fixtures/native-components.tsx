import React from 'react';

import Wave from '../../src/components/Animation/Wave';
import Button from '../../src/components/Button';
import Checkbox from '../../src/components/Checkbox';
import ConfigProvider from '../../src/components/ConfigProvider';
import Input from '../../src/components/Input';
import InputNumber from '../../src/components/InputNumber';
import Tag from '../../src/components/Tag';

export const NativeComponentsFixture = () => (
  <ConfigProvider
    componentSize="medium"
    direction="rtl"
    locale={{ locale: 'en-US' }}
    theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
  >
    <Button>Button</Button>
    <Checkbox defaultChecked>Checkbox</Checkbox>
    <Checkbox.Group defaultValue={['a']}>
      <Checkbox value="a">A</Checkbox>
      <Checkbox value="b">B</Checkbox>
    </Checkbox.Group>
    <Input allowClear defaultValue="input" />
    <Input.TextArea defaultValue="textarea" />
    <Input.Password defaultValue="password" />
    <Input.OTP defaultValue="12" length={2} />
    <Input.Search
      defaultValue="search"
      enterButton={<button type="button">Custom search</button>}
    />
    <Input.SearchTrigger />
    <Input.Select>https://</Input.Select>
    <InputNumber defaultValue={1} />
    <Tag>Tag</Tag>
    <Wave animation="wave">
      <button type="button">Wave</button>
    </Wave>
  </ConfigProvider>
);
