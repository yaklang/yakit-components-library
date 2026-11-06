import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState, type ReactNode } from 'react';

import Button from '../../src/components/Button';
import Modal, { type ModalProps, type ModalSize } from '../../src/components/Modal';
import { DocumentDuplicateOutlined } from '../../src/icons/outline';
import { CloudDownloadSolid, ExclamationSolid } from '../../src/icons/solid';

import './Modal.stories.css';

const ContentPlaceholder = () => <div className="modal-demo-placeholder">内容区域</div>;

const DemoSwitch = ({ size }: { size: ModalSize }) => {
  const [checked, setChecked] = useState(false);
  const medium = size === 'medium';
  const height = medium ? 20 : 16;

  return (
    <span
      className="modal-demo-switch"
      style={{
        fontSize: medium ? 14 : 12,
        letterSpacing: medium ? '0.1px' : '0.5px',
        lineHeight: medium ? '20px' : '16px',
      }}
    >
      <button
        aria-checked={checked}
        aria-label="Switch button"
        onClick={() => setChecked((value) => !value)}
        role="switch"
        style={{
          background: checked
            ? 'var(--Colors-Use-Main-Primary)'
            : 'var(--Colors-Use-Neutral-Disable)',
          height,
          justifyContent: checked ? 'flex-end' : 'flex-start',
          width: medium ? 36 : 28,
        }}
        type="button"
      >
        <span style={{ height: height - 4, width: height - 4 }} />
      </button>
      Switch button
    </span>
  );
};

const DemoCheckbox = ({ children, size = 'small' }: { children: ReactNode; size?: ModalSize }) => {
  const [checked, setChecked] = useState(false);
  const medium = size === 'medium';
  const box = medium ? 20 : 16;

  return (
    <label
      className="modal-demo-check"
      style={{
        fontSize: medium ? 14 : 12,
        letterSpacing: medium ? '0.1px' : '0.5px',
        lineHeight: medium ? '20px' : '16px',
      }}
    >
      <input
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
        style={{ height: box, width: box }}
        type="checkbox"
      />
      <span>{children}</span>
    </label>
  );
};

const dialogArgs = {
  cancelText: 'No',
  okText: 'Yes',
  subTitle: '这里是辅助性内容',
  title: 'Title',
} satisfies Partial<ModalProps>;

const DialogPreview = ({ size, variant }: { size: ModalSize; variant: ModalProps['variant'] }) => (
  <Modal
    {...dialogArgs}
    footerExtra={
      variant === 'banner' ? (
        <DemoCheckbox size={size}>Check box</DemoCheckbox>
      ) : (
        <DemoSwitch size={size} />
      )
    }
    getContainer={false}
    open
    size={size}
    statusBar={
      variant === 'banner' ? (
        <>
          当前系统代理状态：<strong>已启用</strong>
        </>
      ) : undefined
    }
    variant={variant}
  >
    <ContentPlaceholder />
  </Modal>
);

const EngineMissing = () => (
  <Modal
    footer={
      <>
        <Button size="huge" type="outline2">
          取消
        </Button>
        <Button size="huge" type="primary">
          一键安装
        </Button>
      </>
    }
    footerExtra={
      <Button size="huge" type="outline2">
        远程连接
      </Button>
    }
    getContainer={false}
    icon={<ExclamationSolid color="var(--Colors-Use-Main-Primary)" size={32} />}
    layout="alert"
    onHelp={() => undefined}
    open
    title="未安装引擎"
  >
    <span>你可选择安装 Yak 引擎启动软件，或远程连接启动</span>
    <div className="modal-demo-note">
      <span>当前系统为(darwin-arm64)，如果未安装 Rosetta 2, 将无法运行 Yak 核心引擎</span>
      <span>运行以下命令可手动安装 Rosetta，如已安装可忽略</span>
      <span className="modal-demo-command">
        softwareupdate --install-rosetta
        <button
          aria-label="复制命令"
          onClick={() => navigator.clipboard?.writeText('softwareupdate --install-rosetta')}
          type="button"
        >
          <DocumentDuplicateOutlined size={12} />
        </button>
      </span>
    </div>
    <DemoCheckbox>
      勾选同意<span className="modal-demo-link">《用户协议》</span>
    </DemoCheckbox>
  </Modal>
);

const EngineInstalling = () => (
  <Modal
    cancelText="取消"
    getContainer={false}
    icon={<CloudDownloadSolid color="var(--Colors-Use-Main-Primary)" size={32} />}
    layout="alert"
    onHelp={() => undefined}
    open
    showOk={false}
    title="引擎安装中..."
  >
    <div>
      <div className="modal-demo-progress">
        <span style={{ width: '25%' }} />
      </div>
    </div>
    <div className="modal-demo-percent">进度 25%</div>
    <div className="modal-demo-meta">
      <span>剩余时间：0.06s</span>
      <i />
      <span>耗时：0.06s</span>
      <i />
      <span>下载速度：0.00M/s</span>
    </div>
    <span>This is some info...</span>
  </Modal>
);

const StatusPreview = ({
  children,
  status,
  title,
}: {
  children: string;
  status: NonNullable<ModalProps['status']>;
  title: string;
}) => (
  <Modal
    cancelText="Cancel"
    getContainer={false}
    layout="alert"
    okText="Done"
    onHelp={() => undefined}
    open
    status={status}
    title={title}
  >
    {children}
  </Modal>
);

const OpenExample = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="modal-demo-row">
      <Button onClick={() => setOpen(true)} type="primary">
        打开对话框
      </Button>
      <Modal
        {...dialogArgs}
        footerExtra={<DemoSwitch size="small" />}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        open={open}
      >
        <ContentPlaceholder />
      </Modal>
    </div>
  );
};

const CANVAS_BG = 'var(--Colors-Use-Basic-Background)';
const CANVAS_FG = 'var(--Colors-Use-Neutral-Text-1-Title)';

const meta = {
  title: 'YakitUi/通用/Modal',
  component: Modal,
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as 'light' | 'dark') ?? 'light';
      // Scope dark/light canvas paint to Modal stories only (not global preview).
      useEffect(() => {
        const root = document.getElementById('storybook-root');
        const prev = root
          ? {
              background: root.style.background,
              color: root.style.color,
              minHeight: root.style.minHeight,
            }
          : null;
        if (root) {
          root.style.background = CANVAS_BG;
          root.style.color = CANVAS_FG;
          root.style.minHeight = '100%';
        }
        return () => {
          if (!root || !prev) return;
          root.style.background = prev.background;
          root.style.color = prev.color;
          root.style.minHeight = prev.minHeight;
        };
      }, [theme]);

      return (
        <div
          data-theme={theme}
          style={{
            background: CANVAS_BG,
            boxSizing: 'border-box',
            color: CANVAS_FG,
            minHeight: '100%',
            minWidth: 0,
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    layout: { control: 'select', options: ['dialog', 'alert'] },
    variant: { control: 'select', options: ['basic', 'banner'] },
    size: { control: 'select', options: ['small', 'medium'] },
    status: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    open: { control: 'boolean' },
    closable: { control: 'boolean' },
    mask: { control: 'boolean' },
    maskClosable: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    confirmLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Style01Small: Story = {
  name: 'Modal/01 Style 01 · S',
  render: () => <DialogPreview size="small" variant="basic" />,
};

export const Style01Medium: Story = {
  name: 'Modal/01 Style 01 · M',
  render: () => <DialogPreview size="medium" variant="basic" />,
};

export const Style02Small: Story = {
  name: 'Modal/01 Style 02 · S',
  render: () => <DialogPreview size="small" variant="banner" />,
};

export const Style02Medium: Story = {
  name: 'Modal/01 Style 02 · M',
  render: () => <DialogPreview size="medium" variant="banner" />,
};

export const Modal01: Story = {
  name: 'Modal/01',
  render: () => (
    <section className="modal-demo-page">
      <h2 className="modal-demo-heading">Modal/01</h2>
      <div className="modal-demo-grid">
        <div>
          <p className="modal-demo-label">Style 01 · S</p>
          <DialogPreview size="small" variant="basic" />
        </div>
        <div>
          <p className="modal-demo-label">Style 02 · S</p>
          <DialogPreview size="small" variant="banner" />
        </div>
        <div>
          <p className="modal-demo-label">Style 01 · M</p>
          <DialogPreview size="medium" variant="basic" />
        </div>
        <div>
          <p className="modal-demo-label">Style 02 · M</p>
          <DialogPreview size="medium" variant="banner" />
        </div>
      </div>
    </section>
  ),
};

export const NotInstalled: Story = {
  name: 'Modal/02 未安装',
  render: () => <EngineMissing />,
};

export const Installing: Story = {
  name: 'Modal/02 安装中',
  render: () => <EngineInstalling />,
};

export const Info: Story = {
  name: 'Modal/02 Info',
  render: () => (
    <StatusPreview status="info" title="This is some info">
      This is some info...
    </StatusPreview>
  ),
};

export const Success: Story = {
  name: 'Modal/02 Success',
  render: () => (
    <StatusPreview status="success" title="Some task has completed!">
      Some contents...
    </StatusPreview>
  ),
};

export const Warning: Story = {
  name: 'Modal/02 Warning',
  render: () => (
    <StatusPreview status="warning" title="This is a warning message">
      Some contents...
    </StatusPreview>
  ),
};

export const Error: Story = {
  name: 'Modal/02 Error',
  render: () => (
    <StatusPreview status="error" title="This is an error message">
      Some contents...
    </StatusPreview>
  ),
};

export const Modal02: Story = {
  name: 'Modal/02',
  render: () => (
    <section className="modal-demo-page">
      <h2 className="modal-demo-heading">Modal/02</h2>
      <div className="modal-demo-grid">
        <div>
          <p className="modal-demo-label">未安装</p>
          <EngineMissing />
        </div>
        <div>
          <p className="modal-demo-label">安装中</p>
          <EngineInstalling />
        </div>
        <div>
          <p className="modal-demo-label">Info</p>
          <StatusPreview status="info" title="This is some info">
            This is some info...
          </StatusPreview>
        </div>
        <div>
          <p className="modal-demo-label">Success</p>
          <StatusPreview status="success" title="Some task has completed!">
            Some contents...
          </StatusPreview>
        </div>
        <div>
          <p className="modal-demo-label">Warning</p>
          <StatusPreview status="warning" title="This is a warning message">
            Some contents...
          </StatusPreview>
        </div>
        <div>
          <p className="modal-demo-label">Error</p>
          <StatusPreview status="error" title="This is an error message">
            Some contents...
          </StatusPreview>
        </div>
      </div>
    </section>
  ),
};

export const Interactive: Story = {
  name: '打开 / 关闭',
  render: () => <OpenExample />,
};
