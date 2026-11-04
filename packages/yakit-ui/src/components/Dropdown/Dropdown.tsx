import classNames from 'classnames';
import {
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import { DropdownMenuPanel } from './DropdownMenu';
import './style/index.css';
import type {
  DropdownPlacement,
  DropdownProps,
  DropdownSemanticClassNames,
  DropdownSemanticStyles,
  DropdownTrigger,
} from './type';

const yakitPrefix = 'yakit-dropdown';
/** antd 兼容前缀，供主项目 theme / 页面 :global(.ant-dropdown*) 命中 */
const antPrefix = 'ant-dropdown';

const DEFAULT_TRIGGERS: DropdownTrigger[] = ['hover'];
const DEFAULT_PLACEMENT: DropdownPlacement = 'bottomLeft';
/** 无箭头时面板与触发器的间距 */
const POPUP_GAP = 4;
/**
 * 有箭头时的面板间距：箭头 8px 旋转 45° 对角线约 11.3px，中心骑面板边、尖端伸出约 5.7px，
 * 10px 间距让箭头尖与触发器边缘留约 2px 间隙（尖端不插进按钮，视觉不粘连）
 */
const ARROW_POPUP_GAP = 10;

const resolveSemantic = <T,>(
  value: T | ((info: { props: Readonly<DropdownProps> }) => T) | undefined,
  info: { props: Readonly<DropdownProps> },
): T | undefined =>
  typeof value === 'function'
    ? (value as (semanticInfo: { props: Readonly<DropdownProps> }) => T)(info)
    : value;

type PopupPosition = {
  top: number;
  left: number;
  transformOrigin: string;
  arrowTop?: number;
  arrowLeft?: number;
};

const computePosition = (
  triggerRect: DOMRect,
  popupRect: { width: number; height: number },
  placement: DropdownPlacement,
  gap = 4,
): PopupPosition => {
  const { width: pw, height: ph } = popupRect;
  const { top, left, right, bottom, width: tw, height: th } = triggerRect;

  const centers = {
    x: left + tw / 2 - pw / 2,
    y: top + th / 2 - ph / 2,
  };

  switch (placement) {
    case 'top':
      return { top: top - ph - gap, left: centers.x, transformOrigin: 'center bottom' };
    case 'topLeft':
      return { top: top - ph - gap, left, transformOrigin: 'left bottom' };
    case 'topCenter':
      return { top: top - ph - gap, left: centers.x, transformOrigin: 'center bottom' };
    case 'topRight':
      return { top: top - ph - gap, left: right - pw, transformOrigin: 'right bottom' };
    case 'bottom':
      return { top: bottom + gap, left: centers.x, transformOrigin: 'center top' };
    case 'bottomCenter':
      return { top: bottom + gap, left: centers.x, transformOrigin: 'center top' };
    case 'bottomRight':
      return { top: bottom + gap, left: right - pw, transformOrigin: 'right top' };
    case 'left':
      return { top: centers.y, left: left - pw - gap, transformOrigin: 'right center' };
    case 'leftTop':
      return { top, left: left - pw - gap, transformOrigin: 'right top' };
    case 'leftBottom':
      return { top: bottom - ph, left: left - pw - gap, transformOrigin: 'right bottom' };
    case 'right':
      return { top: centers.y, left: right + gap, transformOrigin: 'left center' };
    case 'rightTop':
      return { top, left: right + gap, transformOrigin: 'left top' };
    case 'rightBottom':
      return { top: bottom - ph, left: right + gap, transformOrigin: 'left bottom' };
    case 'bottomLeft':
    default:
      return { top: bottom + gap, left, transformOrigin: 'left top' };
  }
};

const clampToViewport = (
  pos: PopupPosition,
  popupRect: { width: number; height: number },
  padding = 8,
): PopupPosition => {
  if (typeof window === 'undefined') return pos;
  const maxLeft = window.innerWidth - popupRect.width - padding;
  const maxTop = window.innerHeight - popupRect.height - padding;
  return {
    ...pos,
    left: Math.min(Math.max(padding, pos.left), Math.max(padding, maxLeft)),
    top: Math.min(Math.max(padding, pos.top), Math.max(padding, maxTop)),
  };
};

export function Dropdown(allProps: DropdownProps) {
  const {
    menu,
    autoFocus,
    arrow = false,
    trigger: triggerProp,
    dropdownRender,
    popupRender,
    onOpenChange,
    open: openProp,
    defaultOpen = false,
    disabled: disabledProp,
    destroyPopupOnHide,
    destroyOnHidden,
    getPopupContainer,
    prefixCls: prefixClsProp,
    className,
    rootClassName,
    style,
    placement = DEFAULT_PLACEMENT,
    overlayClassName,
    overlayStyle,
    forceRender,
    mouseEnterDelay = 0.1,
    mouseLeaveDelay = 0.1,
    openClassName,
    children,
    autoAdjustOverflow = true,
    classNames: semanticClassNamesProp,
    styles: semanticStylesProp,
  } = allProps;

  const config = useYakitConfig();
  const dropdownToken = config.token.YakitDropdown;
  const reactId = useId();
  const yakit = prefixClsProp ?? yakitPrefix;
  const ant = antPrefix;
  const disabled = disabledProp ?? config.componentDisabled ?? false;
  const triggers = triggerProp?.length ? triggerProp : DEFAULT_TRIGGERS;
  const destroyHidden = destroyOnHidden ?? destroyPopupOnHide ?? false;

  const isControlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = isControlled ? Boolean(openProp) : innerOpen;

  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<PopupPosition>({
    top: -9999,
    left: -9999,
    transformOrigin: 'left top',
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const semanticInfo = useMemo(() => ({ props: allProps as Readonly<DropdownProps> }), [allProps]);
  const slotClasses =
    resolveSemantic<DropdownSemanticClassNames>(semanticClassNamesProp, semanticInfo) ?? {};
  const slotStyles =
    resolveSemantic<DropdownSemanticStyles>(semanticStylesProp, semanticInfo) ?? {};

  const clearTimers = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const setOpen = useCallback(
    (next: boolean, source: 'trigger' | 'menu') => {
      if (disabled && next) return;
      if (!isControlled) {
        setInnerOpen(next);
      }
      onOpenChange?.(next, { source });
    },
    [disabled, isControlled, onOpenChange],
  );

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const popupEl = popupRef.current;
    if (!triggerEl || !popupEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const popupRect = {
      width: popupEl.offsetWidth || 160,
      height: popupEl.offsetHeight || 40,
    };
    let next = computePosition(
      triggerRect,
      popupRect,
      placement,
      arrow ? ARROW_POPUP_GAP : POPUP_GAP,
    );
    if (autoAdjustOverflow) {
      next = clampToViewport(next, popupRect);
    }
    if (arrow) {
      // 角标一律指向触发器中心（pointAtCenter 推广到所有 arrow 形式）：
      // 箭头 border-box 8px，inline left/top 定位其左上角，半宽 4px 使箭头中心对准目标；
      // 旋转不改变元素中心；夹取防止触发器在面板外时箭头越出面板边缘
      if (placement.startsWith('top') || placement.startsWith('bottom')) {
        const target = triggerRect.left + triggerRect.width / 2 - next.left - 4;
        next.arrowLeft = Math.min(Math.max(target, 4), Math.max(4, popupRect.width - 12));
      } else {
        const target = triggerRect.top + triggerRect.height / 2 - next.top - 4;
        next.arrowTop = Math.min(Math.max(target, 4), Math.max(4, popupRect.height - 12));
      }
    }
    setPosition(next);
  }, [arrow, autoAdjustOverflow, placement]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    updatePosition();
    const onWin = () => updatePosition();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [open, updatePosition, children, menu, mounted]);

  useEffect(() => {
    if (!open || !autoFocus) return;
    const id = window.setTimeout(() => {
      popupRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
        ?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, autoFocus]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!open) return;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const onDocMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      // 延后到当前指针手势的 click 之后，避免受控外部 toggle：
      // mousedown 先关、click 再 !open 又被打开（不必故事层 stopPropagation）
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        setOpen(false, 'trigger');
      }, 0);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false, 'trigger');
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  const openWithDelay = (source: 'trigger' | 'menu', delaySec: number) => {
    clearTimers();
    if (delaySec <= 0) {
      setOpen(true, source);
      return;
    }
    enterTimer.current = setTimeout(() => setOpen(true, source), delaySec * 1000);
  };

  const closeWithDelay = (source: 'trigger' | 'menu', delaySec: number) => {
    clearTimers();
    if (delaySec <= 0) {
      setOpen(false, source);
      return;
    }
    leaveTimer.current = setTimeout(() => setOpen(false, source), delaySec * 1000);
  };

  const hasHover = triggers.includes('hover');
  const hasClick = triggers.includes('click');
  const hasContext = triggers.includes('contextMenu');

  const child = children ?? <span />;
  type TriggerChildProps = {
    className?: string;
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    onContextMenu?: (event: ReactMouseEvent<HTMLElement>) => void;
    onMouseEnter?: (event: ReactMouseEvent<HTMLElement>) => void;
    onMouseLeave?: (event: ReactMouseEvent<HTMLElement>) => void;
  };

  const childElement =
    isValidElement(child) && child.type !== Fragment
      ? (child as ReactElement<TriggerChildProps>)
      : ((<span>{child}</span>) as ReactElement<TriggerChildProps>);

  // Button 等子组件不转发 ref / 未透传 mouse 事件时，cloneElement 无法拿到 DOM，弹层会停在 -9999。
  // 用 span 包裹承接 ref 与触发事件（对齐 antd/rc-trigger 做法）。
  const mergedChild = cloneElement(childElement, {
    className: classNames(
      childElement.props.className,
      open && (openClassName ?? `${yakit}-open`),
      open && `${ant}-open`,
    ),
  });

  const triggerNode = (
    <span
      ref={(node) => {
        triggerRef.current = node;
      }}
      className={classNames(`${yakit}-trigger`, open && `${yakit}-trigger-open`)}
      style={{ display: 'inline-flex', maxWidth: '100%', verticalAlign: 'top' }}
      onClick={(_event: ReactMouseEvent<HTMLElement>) => {
        if (disabled) return;
        if (hasClick) {
          setOpen(!open, 'trigger');
        }
      }}
      onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
        if (disabled || !hasContext) return;
        event.preventDefault();
        setOpen(true, 'trigger');
      }}
      onMouseEnter={(_event: ReactMouseEvent<HTMLElement>) => {
        if (disabled || !hasHover) return;
        openWithDelay('trigger', mouseEnterDelay);
      }}
      onMouseLeave={(_event: ReactMouseEvent<HTMLElement>) => {
        if (disabled || !hasHover) return;
        closeWithDelay('trigger', mouseLeaveDelay);
      }}
    >
      {mergedChild}
    </span>
  );

  const handleMenuItemClick = () => {
    setOpen(false, 'menu');
  };

  const menuNode = menu ? (
    <DropdownMenuPanel
      {...menu}
      prefixCls={yakit}
      semanticClassNames={slotClasses}
      semanticStyles={slotStyles}
      onItemClick={handleMenuItemClick}
    />
  ) : null;

  const renderPopup = popupRender ?? dropdownRender;
  const popupContent: ReactNode = renderPopup ? renderPopup(menuNode) : menuNode;

  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    '--yakit-dropdown-radius': dropdownToken?.borderRadius,
    '--yakit-dropdown-item-radius': dropdownToken?.itemBorderRadius,
    '--yakit-dropdown-panel-padding': dropdownToken?.panelPadding,
    '--yakit-dropdown-item-padding-inline': dropdownToken?.itemPaddingInline,
    '--yakit-dropdown-item-min-height-md': dropdownToken?.itemMinHeightMD,
    '--yakit-dropdown-item-min-height-lg': dropdownToken?.itemMinHeightLG,
    '--yakit-dropdown-item-gap': dropdownToken?.itemGap,
    '--yakit-dropdown-font-size': dropdownToken?.fontSize,
    '--yakit-dropdown-line-height': dropdownToken?.lineHeight,
    '--yakit-dropdown-description-font-size': dropdownToken?.descriptionFontSize,
    '--yakit-dropdown-description-line-height': dropdownToken?.descriptionLineHeight,
    ...style,
  } as YakitCSSProperties;

  const shouldRenderPopup = mounted && (open || forceRender || (!destroyHidden && open === false));
  const popupVisible = open;

  const popupClassName = classNames(
    ant,
    yakit,
    `${yakit}-placement-${placement}`,
    {
      [`${ant}-hidden`]: !popupVisible,
      [`${yakit}-hidden`]: !popupVisible,
      [`${yakit}-show-arrow`]: !!arrow,
    },
    overlayClassName,
    rootClassName,
    className,
    slotClasses.root,
  );

  const popupStyle: CSSProperties = {
    ...tokenStyle,
    ...overlayStyle,
    ...slotStyles.root,
    position: 'fixed',
    top: position.top,
    left: position.left,
    transformOrigin: position.transformOrigin,
    zIndex: 1050,
    visibility: popupVisible ? 'visible' : 'hidden',
    pointerEvents: popupVisible ? 'auto' : 'none',
  };

  const container =
    typeof document !== 'undefined'
      ? (getPopupContainer?.(triggerRef.current ?? document.body) ?? document.body)
      : null;

  const popup =
    shouldRenderPopup && container
      ? createPortal(
          <div
            ref={popupRef}
            id={`${yakit}-popup-${reactId}`}
            className={popupClassName}
            style={popupStyle}
            data-theme={config.mode}
            dir={config.direction}
            onMouseEnter={() => {
              if (!hasHover) return;
              clearTimers();
            }}
            onMouseLeave={() => {
              if (!hasHover) return;
              closeWithDelay('trigger', mouseLeaveDelay);
            }}
          >
            {!!arrow && (
              <div
                className={classNames(`${ant}-arrow`, `${yakit}-arrow`)}
                style={{ top: position.arrowTop, left: position.arrowLeft }}
              />
            )}
            <div
              className={classNames(`${yakit}-panel`, `${ant}-menu-submenu-popup`)}
              style={menu?.width != null ? { width: menu.width, minWidth: menu.width } : undefined}
            >
              {popupContent}
            </div>
          </div>,
          container,
        )
      : null;

  return (
    <>
      {triggerNode}
      {popup}
    </>
  );
}

Dropdown.displayName = 'Dropdown';

export default Dropdown;
