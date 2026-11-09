import React from 'react';

import Wave from '../../src/components/Animation/Wave';
import Button from '../../src/components/Button';
import ConfigProvider from '../../src/components/ConfigProvider';
import Input from '../../src/components/Input';
import InputNumber from '../../src/components/InputNumber';
import Tag from '../../src/components/Tag';
import Tree from '../../src/components/Tree';

export const NativeComponentsFixture = () => (
  <ConfigProvider
    componentSize="medium"
    direction="rtl"
    locale={{ locale: 'en-US' }}
    theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
  >
    <Button>Button</Button>
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
    <Tree treeData={[{ key: '1', title: 'tree' }]} />
    <Wave animation="wave">
      <button type="button">Wave</button>
    </Wave>
  </ConfigProvider>
);
