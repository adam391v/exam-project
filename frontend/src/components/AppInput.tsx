import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({
  label,
  error,
  icon,
  containerClassName = '',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (typeof label === 'string' ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-xl border px-4 py-2.5 text-sm transition-all
            focus:outline-none focus:ring-2
            ${icon ? 'pl-10' : ''}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/50 text-red-900 placeholder-red-300' 
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100 bg-white text-slate-900 placeholder-slate-400'
            }
            disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 font-medium mt-1">{error}</p>
      )}
    </div>
  );
});

AppInput.displayName = 'AppInput';

export default AppInput;
