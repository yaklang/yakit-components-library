import classNames from 'classnames';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import useYakitConfig from '../../hooks/useYakitConfig';
import { QuestionMarkCircleOutlined, XOutlined } from '../../icons/outline';
import {
  CheckCircleSolid,
  ExclamationCircleSolid,
  ExclamationSolid,
  InformationCircleSolid,
} from '../../icons/solid';
import type { IconComponent } from '../../icons/types';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';
import Button from '../Button';

import './style/index.css';

import type { ModalProps, ModalStatus } from './type';

const prefix = 'yakit-modal';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const STATUS_ICONS: Record<ModalStatus, { Icon: IconComponent; color: string }> = {
  info: { Icon: InformationCircleSolid, color: 'var(--Colors-Use-Purple-Primary)' },
  success: { Icon: CheckCircleSolid, color: 'var(--Colors-Use-Success-Primary)' },
  warning: { Icon: ExclamationSolid, color: 'var(--Colors-Use-Warning-Primary)' },
  error: { Icon: ExclamationCircleSolid, color: 'var(--Colors-Use-Error-Primary)' },
};

const StatusGlyph = ({ status }: { status: ModalStatus }) => {
  const { Icon, color } = STATUS_ICONS[status];
  return <Icon color={color} size={32} />;
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const resolveContainer = (getContainer: ModalProps['getContainer']) => {
  if (getContainer === false || typeof document === 'undefined') return null;
  if (typeof getContainer === 'function') return getContainer();
  return getContainer ?? document.body;
};

export const Modal = ({
  open: openProp,
  defaultOpen = false,
  layout = 'dialog',
  variant = 'basic',
  size = 'small',
  status,
  title,
  subTitle,
  statusBar,
  icon,
  children,
  footer,
  footerExtra,
  okText = '确定',
  cancelText = '取消',
  showOk = true,
  showCancel = true,
  confirmLoading = false,
  okButtonProps,
  cancelButtonProps,
  closable,
  closeLabel = '关闭',
  mask = true,
  maskClosable = true,
  keyboard = true,
  getContainer,
  width,
  zIndex = 1000,
  showHelp,
  helpLabel = '帮助',
  onHelp,
  onOk,
  onCancel,
  bodyStyle,
  className,
  rootClassName,
  style,
}: ModalProps) => {
  const config = useYakitConfig();
  const titleId = useId();
  const subTitleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const inline = getContainer === false;
  const resolvedClosable = closable ?? layout === 'dialog';
  const resolvedShowHelp = showHelp ?? layout === 'alert';
  const actionSize = layout === 'alert' ? 'huge' : size === 'medium' ? 'large' : 'medium';
  const closeSize = size === 'medium' ? 'large' : 'medium';

  const close = useCallback(() => {
    onCancel?.();
    if (openProp === undefined) setUncontrolledOpen(false);
  }, [onCancel, openProp]);

  const confirm = useCallback(() => {
    onOk?.();
    if (openProp === undefined) setUncontrolledOpen(false);
  }, [onOk, openProp]);

  useIsomorphicLayoutEffect(() => {
    if (!open || inline) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [inline, open]);

  useIsomorphicLayoutEffect(() => {
    if (!open || inline || !keyboard) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, inline, keyboard, open]);

  useIsomorphicLayoutEffect(() => {
    const panelNode = panelRef.current;
    if (!open || inline || !panelNode) return undefined;
    const previouslyFocused = document.activeElement;
    panelNode.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(panelNode.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute('disabled'),
      );
      if (items.length === 0) {
        event.preventDefault();
        panelNode.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelNode)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    panelNode.addEventListener('keydown', onKeyDown);
    return () => {
      panelNode.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [inline, open]);

  useIsomorphicLayoutEffect(() => {
    const wrapNode = wrapRef.current;
    if (!open || inline || !maskClosable || !wrapNode) return undefined;
    const onClick = (event: MouseEvent) => {
      if (event.target === wrapNode) close();
    };
    wrapNode.addEventListener('click', onClick);
    return () => wrapNode.removeEventListener('click', onClick);
  }, [close, inline, maskClosable, open]);

  if (!open) return null;

  const describedBy = [subTitle ? subTitleId : null, children ? bodyId : null]
    .filter(Boolean)
    .join(' ');
  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    '--yakit-modal-z-index': zIndex,
  } as YakitCSSProperties;
  const panelStyle: CSSProperties = {
    width: width ?? (layout === 'alert' ? 448 : 560),
    ...tokenStyle,
    ...style,
  };
  const resolvedIcon = icon ?? (status ? <StatusGlyph status={status} /> : null);
  const actions =
    footer === undefined ? (
      <>
        {showCancel ? (
          <Button
            disabled={cancelButtonProps?.disabled}
            htmlType="button"
            loading={cancelButtonProps?.loading}
            onClick={close}
            size={actionSize}
            type="outline2"
          >
            {cancelText}
          </Button>
        ) : null}
        {showOk ? (
          <Button
            disabled={okButtonProps?.disabled}
            htmlType="button"
            loading={confirmLoading || okButtonProps?.loading}
            onClick={confirm}
            size={actionSize}
            type="primary"
          >
            {okText}
          </Button>
        ) : null}
      </>
    ) : (
      footer
    );
  const showFooter =
    actions !== null && (footer !== undefined || showCancel || showOk || Boolean(footerExtra));
  const closeButton = resolvedClosable ? (
    <Button
      animation={false}
      aria-label={closeLabel}
      className={`${prefix}-close`}
      htmlType="button"
      icon={<XOutlined />}
      onClick={close}
      size={closeSize}
      type="text2"
    />
  ) : null;
  const footerNode = showFooter ? (
    <div className={`${prefix}-footer`}>
      {footerExtra ? <div className={`${prefix}-footer-extra`}>{footerExtra}</div> : null}
      {actions !== null ? <div className={`${prefix}-footer-actions`}>{actions}</div> : null}
    </div>
  ) : null;

  const panel = (
    <div
      aria-describedby={describedBy || undefined}
      aria-label={title ? undefined : '对话框'}
      aria-labelledby={title ? titleId : undefined}
      aria-modal={inline ? undefined : true}
      className={classNames(
        prefix,
        `${prefix}-${layout}`,
        `${prefix}-${size}`,
        `${prefix}-${variant}`,
        status && `${prefix}-${status}`,
        className,
      )}
      data-theme={config.mode}
      dir={config.direction}
      ref={panelRef}
      role="dialog"
      style={panelStyle}
      tabIndex={-1}
    >
      {layout === 'alert' ? (
        <>
          {resolvedIcon ? <div className={`${prefix}-icon`}>{resolvedIcon}</div> : null}
          {resolvedShowHelp ? (
            <button
              aria-label={helpLabel}
              className={`${prefix}-help`}
              onClick={onHelp}
              type="button"
            >
              <QuestionMarkCircleOutlined color="currentColor" size={20} />
            </button>
          ) : null}
          <div className={`${prefix}-alert-content`}>
            <div className={`${prefix}-alert-head`}>
              {title ? (
                <div className={`${prefix}-title`} id={titleId}>
                  {title}
                </div>
              ) : null}
              {closeButton}
            </div>
            {subTitle ? (
              <div className={`${prefix}-subtitle`} id={subTitleId}>
                {subTitle}
              </div>
            ) : null}
            {children ? (
              <div className={`${prefix}-body`} id={bodyId} style={bodyStyle}>
                {children}
              </div>
            ) : null}
          </div>
          {footerNode}
        </>
      ) : (
        <>
          <div className={`${prefix}-header`}>
            <div className={`${prefix}-heading`}>
              {title ? (
                <div className={`${prefix}-title`} id={titleId}>
                  {title}
                </div>
              ) : null}
              {subTitle ? (
                <div className={`${prefix}-subtitle`} id={subTitleId}>
                  {subTitle}
                </div>
              ) : null}
            </div>
            {closeButton}
          </div>
          {variant === 'banner' && statusBar ? (
            <div className={`${prefix}-status`}>{statusBar}</div>
          ) : null}
          <div className={`${prefix}-body`} id={bodyId} style={bodyStyle}>
            {children}
          </div>
          {footerNode}
        </>
      )}
    </div>
  );

  if (inline || typeof document === 'undefined') return panel;

  const container = resolveContainer(getContainer);
  if (!container) return panel;

  return createPortal(
    <div
      className={classNames(`${prefix}-root`, rootClassName)}
      data-theme={config.mode}
      style={tokenStyle}
    >
      {mask ? <div className={`${prefix}-mask`} /> : null}
      <div className={`${prefix}-wrap`} ref={wrapRef}>
        {panel}
      </div>
    </div>,
    container,
  );
};
