import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'purple' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}, ref) => {
  
  // Base classes that all buttons share
  const baseClasses = 'inline-flex items-center justify-center transition-all focus:outline-none';

  // Variant classes
  const variantClasses = {
    primary: 'font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
    secondary: 'font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1',
    danger: 'font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-1',
    outline: 'font-medium bg-transparent border border-slate-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 text-slate-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1',
    ghost: 'font-medium bg-transparent hover:bg-slate-100 hover:text-slate-900 text-slate-500',
    'danger-ghost': 'font-medium bg-transparent hover:bg-red-50 text-slate-400 hover:text-red-600',
    purple: 'font-semibold bg-purple-50 hover:bg-purple-100 text-purple-600 focus:ring-2 focus:ring-purple-400 focus:ring-offset-1',
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2',
    icon: 'p-1.5 rounded-lg', // Tối ưu cho icon-only button
  };

  // State classes
  const stateClasses = disabled || isLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
  
  // Width class
  const widthClass = fullWidth ? 'w-full' : '';

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className={`animate-spin ${size === 'sm' || size === 'icon' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />;
    }
    if (icon) {
      return <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>;
    }
    return null;
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${stateClasses} 
        ${widthClass} 
        ${className}
      `}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
});

AppButton.displayName = 'AppButton';

export default AppButton;
