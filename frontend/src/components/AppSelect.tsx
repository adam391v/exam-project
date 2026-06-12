import ReactSelect, { type Props as ReactSelectProps, type StylesConfig, type GroupBase } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
}

interface AppSelectProps extends Omit<ReactSelectProps<SelectOption, false, GroupBase<SelectOption>>, 'styles' | 'theme'> {
  /** Hiển thị error state */
  error?: boolean | string;
}

/** Custom styles phù hợp design system */
const customStyles = (hasError?: boolean | string): StylesConfig<SelectOption, false> => ({
  control: (base, state) => ({
    ...base,
    borderRadius: '0.75rem',
    borderColor: hasError ? '#EF4444' : state.isFocused ? '#3B82F6' : '#CBD5E1',
    boxShadow: state.isFocused
      ? hasError
        ? '0 0 0 2px rgba(239,68,68,0.3)'
        : '0 0 0 2px rgba(59,130,246,0.3)'
      : 'none',
    minHeight: '42px',
    fontSize: '0.875rem',
    '&:hover': {
      borderColor: state.isFocused ? '#3B82F6' : '#94A3B8',
    },
    transition: 'all 0.15s ease',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    padding: '8px 12px',
    backgroundColor: state.isSelected
      ? '#2563EB'
      : state.isFocused
        ? '#EFF6FF'
        : 'transparent',
    color: state.isSelected ? '#fff' : '#1E293B',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#DBEAFE',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94A3B8',
    fontSize: '0.875rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1E293B',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0',
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: '#94A3B8',
    transition: 'transform 0.2s ease',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
    '&:hover': {
      color: '#64748B',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94A3B8',
    padding: '4px',
    '&:hover': {
      color: '#EF4444',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#94A3B8',
  }),
  input: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#1E293B',
  }),
});

export default function AppSelect({ error, ...props }: AppSelectProps) {
  return (
    <ReactSelect<SelectOption, false>
      styles={customStyles(error)}
      noOptionsMessage={() => 'Không có lựa chọn'}
      loadingMessage={() => 'Đang tải...'}
      {...props}
    />
  );
}
