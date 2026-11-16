import {
  CheckOutlined,
  ChevronDownOutlined,
  ChevronUpOutlined,
  TrashOutlined,
  XCircleSolid,
} from '@yakit-libs/yakit-ui-icons';
import { ConfigProvider, Select as AntSelect } from 'antd';
import type { ThemeConfig } from 'antd';
import type { DefaultOptionType, SelectProps as AntSelectProps } from 'antd/es/select';
import classNames from 'classnames';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import Button from '../Button';
import Checkbox from '../Checkbox';
import Tag from '../Tag';

import './style/index.css';
import { createSelectTheme, selectPopupVars } from './theme';
import type { SelectProps, SelectRef, SelectSize } from './type';

const ThemeRoot = ConfigProvider as unknown as (props: {
  children?: ReactNode;
  theme: ThemeConfig;
}) => ReactElement;

const prefixCls = 'yakit-select';

// antd 的组件类型带着它自己解析到的 React。这里收成当前文件的 props，避免两份 @types/react 对不上，属性也能跳到定义。
const Field = AntSelect as unknown as <
  ValueType = unknown,
  OptionType extends DefaultOptionType = DefaultOptionType,
>(
  props: SelectProps<ValueType, OptionType> & { ref?: Ref<SelectRef> },
) => ReactElement;

type VisualSize = SelectSize;

const optionValueOf = (item: unknown) =>
  item !== null && typeof item === 'object' && 'value' in item
    ? (item as { value: unknown }).value
    : item;

const isOptionSelected = (current: unknown, optionValue: unknown) => {
  if (Array.isArray(current)) return current.some((item) => optionValueOf(item) === optionValue);
  if (current == null || current === '') return false;
  return optionValueOf(current) === optionValue;
};

const mergePopupClass = (base: string, popup: unknown) => {
  if (typeof popup === 'string') return { root: classNames(base, popup) };
  if (popup && typeof popup === 'object') {
    const record = popup as { root?: string };
    return { ...record, root: classNames(base, record.root) };
  }
  return { root: base };
};

const mergePopupVars = (
  incoming: AntSelectProps['styles'],
  popupVars?: CSSProperties,
): AntSelectProps['styles'] => {
  if (!popupVars) return incoming;
  if (typeof incoming === 'function') {
    return (info) => {
      const resolved = incoming(info) ?? {};
      return {
        ...resolved,
        popup: {
          ...resolved.popup,
          root: { ...popupVars, ...resolved.popup?.root } as never,
        },
      };
    };
  }
  return {
    ...incoming,
    popup: {
      ...incoming?.popup,
      root: { ...popupVars, ...incoming?.popup?.root } as never,
    },
  };
};

const mergeSemantic = (
  incoming: AntSelectProps['classNames'],
  root: string,
  popupRoot: string,
): AntSelectProps['classNames'] => {
  if (typeof incoming === 'function') {
    return (info) => {
      const resolved = incoming(info) ?? {};
      return {
        ...resolved,
        root: classNames(root, resolved.root),
        popup: mergePopupClass(popupRoot, resolved.popup),
      };
    };
  }
  return {
    ...incoming,
    root: classNames(root, incoming?.root),
    popup: mergePopupClass(popupRoot, incoming?.popup),
  };
};

const SelectInner = <ValueType, OptionType extends DefaultOptionType = DefaultOptionType>(
  {
    allowClear,
    checkbox = false,
    className,
    classNames: semanticClassNames,
    defaultOpen,
    defaultValue,
    direction: directionProp,
    disabled: disabledProp,
    menuItemSelectedIcon,
    mode,
    onChange,
    onKeyDown,
    onOpenChange,
    onOptionDelete,
    open,
    optionRender,
    removeIcon,
    rootClassName,
    tagRender,
    size: sizeProp,
    status,
    style,
    styles: semanticStyles,
    suffixIcon,
    value,
    variant = 'outlined',
    ...rest
  }: SelectProps<ValueType, OptionType>,
  ref: ForwardedRef<SelectRef>,
) => {
  const config = useYakitConfig();
  const selectRef = useRef<SelectRef>(null);
  const disabled = disabledProp ?? config.componentDisabled;
  const visualSize: VisualSize =
    sizeProp ?? (config.componentSize === 'huge' ? 'large' : config.componentSize) ?? 'medium';
  const multiple = mode === 'multiple' || mode === 'tags';
  const checkboxActive = checkbox && multiple;
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false);
  const [popupPass, setPopupPass] = useState(0);
  const popupStamped = useRef(false);
  const [uncontrolledValue, setUncontrolledValue] = useState<ValueType | undefined>(
    defaultValue as ValueType | undefined,
  );
  const mergedOpen = open ?? innerOpen;
  const currentValue = (value !== undefined ? value : uncontrolledValue) as unknown;
  const popupMark = `yakit-select-popup-${useId().replace(/:/g, '')}`;
  const showOptionRow = checkboxActive || Boolean(onOptionDelete);
  const selectToken = config.token.YakitSelect;
  const theme = useMemo(
    () => createSelectTheme(visualSize, checkboxActive, selectToken),
    [checkboxActive, selectToken, visualSize],
  );
  const popupVars = useMemo(() => selectPopupVars(selectToken), [selectToken]);

  useImperativeHandle(ref, () => ({
    focus: (options) => selectRef.current?.focus(options),
    blur: () => selectRef.current?.blur(),
    scrollTo: (arg) => selectRef.current?.scrollTo(arg),
    get nativeElement() {
      return selectRef.current?.nativeElement as HTMLElement;
    },
  }));

  useLayoutEffect(() => {
    selectRef.current?.nativeElement?.setAttribute('data-theme', config.mode);
  }, [config.mode]);

  const findPopup = useCallback(
    () =>
      [...document.querySelectorAll('.yakit-select-dropdown')].find((item) =>
        item.classList.contains(popupMark),
      ),
    [popupMark],
  );

  // rc-select 会把第一次打开推迟到挂载之后，弹层节点还可能再晚一次才进文档。
  // 这两次提交都不会让外层重渲染，所以打开后补查。
  useEffect(() => {
    if (!mergedOpen || popupStamped.current) return;
    setPopupPass((pass) => pass + 1);
  }, [mergedOpen]);

  useLayoutEffect(() => {
    if (!mergedOpen) {
      popupStamped.current = false;
      if (popupPass !== 0) setPopupPass(0);
      return;
    }
    const node = findPopup();
    if (node) {
      node.setAttribute('data-theme', config.mode);
      popupStamped.current = true;
      return;
    }
    if (popupPass > 0 && popupPass < 4) setPopupPass((pass) => pass + 1);
  }, [config.mode, findPopup, mergedOpen, popupPass]);

  const rootClass = classNames(
    prefixCls,
    `${prefixCls}-${visualSize}`,
    `${prefixCls}-${variant}`,
    multiple ? `${prefixCls}-multiple-mode` : `${prefixCls}-single-mode`,
    {
      [`${prefixCls}-clearable`]: Boolean(allowClear),
      [`${prefixCls}-status-${status}`]: status,
    },
    className,
    rootClassName,
  );

  const popupRoot = classNames(
    `${prefixCls}-dropdown`,
    `${prefixCls}-dropdown-${visualSize}`,
    multiple ? `${prefixCls}-dropdown-multiple` : `${prefixCls}-dropdown-single`,
    { [`${prefixCls}-dropdown-checkbox`]: checkboxActive },
    popupMark,
  );

  const resolvedSuffix =
    suffixIcon !== undefined ? (
      suffixIcon
    ) : multiple ? null : mergedOpen ? (
      <ChevronUpOutlined color="currentColor" size={12} />
    ) : (
      <ChevronDownOutlined color="currentColor" size={12} />
    );

  const clearIcon = <XCircleSolid size={14} color="var(--Colors-Use-Neutral-Disable)" />;
  const resolvedAllowClear =
    allowClear === true
      ? { clearIcon }
      : allowClear
        ? { ...allowClear, clearIcon: allowClear.clearIcon ?? clearIcon }
        : allowClear;

  const defaultTagRender: NonNullable<AntSelectProps<ValueType, OptionType>['tagRender']> = (
    tag,
  ) => (
    <span
      className={`${prefixCls}-tag`}
      onMouseDown={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest('.yakit-tag-close')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <Tag
        closable={tag.closable}
        closeIcon={removeIcon}
        disabled={disabled || tag.disabled}
        ellipsis
        onClose={(event) => {
          tag.onClose?.(event);
        }}
        size={visualSize}
      >
        {tag.label}
      </Tag>
    </span>
  );

  const renderOption: AntSelectProps<ValueType, OptionType>['optionRender'] = showOptionRow
    ? (option, info) => {
        if (optionRender) return optionRender(option, info);
        const selected = isOptionSelected(currentValue, option.value);
        const stop = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
        };
        return (
          <div className={`${prefixCls}-option`}>
            {checkboxActive ? (
              <span aria-hidden="true" className={`${prefixCls}-option-check`}>
                <Checkbox
                  checked={selected}
                  disabled={Boolean(option.data.disabled)}
                  tabIndex={-1}
                />
              </span>
            ) : null}
            <span className={`${prefixCls}-option-label`}>{option.label as ReactNode}</span>
            {onOptionDelete && !selected && !option.data.disabled ? (
              <Button
                type="link1"
                colors="danger"
                size="small"
                disabled={false}
                aria-label={config.locale.Select?.removeOption ?? '删除选项'}
                className={`${prefixCls}-option-delete`}
                icon={<TrashOutlined size={12} />}
                onMouseDown={stop}
                onClick={(event) => {
                  stop(event);
                  onOptionDelete(option.data);
                }}
              />
            ) : null}
          </div>
        );
      }
    : optionRender;

  return (
    <ThemeRoot theme={theme}>
      <Field<ValueType, OptionType>
        {...rest}
        ref={selectRef}
        allowClear={resolvedAllowClear}
        classNames={mergeSemantic(semanticClassNames, rootClass, popupRoot)}
        direction={directionProp ?? config.direction}
        disabled={disabled}
        menuItemSelectedIcon={
          menuItemSelectedIcon !== undefined ? (
            menuItemSelectedIcon
          ) : checkboxActive ? null : multiple ? (
            <CheckOutlined color="var(--Colors-Use-Main-Primary)" size={12} />
          ) : undefined
        }
        mode={mode}
        open={open}
        optionRender={renderOption}
        removeIcon={removeIcon}
        size={visualSize}
        tagRender={tagRender ?? (multiple ? defaultTagRender : undefined)}
        status={status}
        style={style}
        styles={mergePopupVars(semanticStyles, popupVars)}
        suffixIcon={resolvedSuffix}
        value={value}
        variant={variant}
        defaultOpen={defaultOpen}
        defaultValue={defaultValue}
        onChange={(next: ValueType, option?: OptionType | OptionType[]) => {
          if (value === undefined) setUncontrolledValue(next);
          onChange?.(next, option);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (event.key !== 'Delete' || event.defaultPrevented || !mergedOpen || !onOptionDelete) {
            return;
          }
          const target = event.target;
          if (
            (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
            target.value
          ) {
            return;
          }
          const button = findPopup()?.querySelector<HTMLButtonElement>(
            '.ant-select-item-option-active .yakit-select-option-delete',
          );
          if (!button) return;
          event.preventDefault();
          button.click();
        }}
        onOpenChange={(next: boolean) => {
          if (open === undefined) setInnerOpen(next);
          onOpenChange?.(next);
        }}
      />
    </ThemeRoot>
  );
};

interface SelectComponent {
  <ValueType = unknown, OptionType extends DefaultOptionType = DefaultOptionType>(
    props: SelectProps<ValueType, OptionType> & { ref?: Ref<SelectRef> },
  ): ReactElement;
}

export const Select = forwardRef(SelectInner) as unknown as SelectComponent;
