import React, { forwardRef, ComponentProps } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

interface AppDatePickerProps extends Omit<ComponentProps<typeof DatePicker>, 'onChange'> {
  value?: string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
}

const AppDatePicker = forwardRef<any, AppDatePickerProps>(
  ({ value, onChange, placeholder = 'Chọn thời gian...', className = '', ...props }, ref) => {
    
    const CustomInput = forwardRef<HTMLInputElement, any>(
      ({ value: inputValue, onClick, placeholder: inputPlaceholder }, inputRef) => (
        <div className={`relative w-full ${className}`}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <input
            ref={inputRef}
            value={inputValue}
            onClick={onClick}
            onChange={() => {}}
            placeholder={inputPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all cursor-pointer hover:border-slate-400"
            readOnly
          />
        </div>
      )
    );
    CustomInput.displayName = 'CustomInput';

    const currentDate = value ? new Date(value) : null;
    const currentHour = currentDate ? currentDate.getHours() : 0;
    const currentMinute = currentDate ? currentDate.getMinutes() : 0;

    const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
      const targetDate = currentDate ? new Date(currentDate) : new Date();
      if (type === 'hour') targetDate.setHours(val);
      if (type === 'minute') targetDate.setMinutes(val);
      // Giữ nguyên giây là 0 cho sạch
      targetDate.setSeconds(0);
      onChange(targetDate);
    };

    return (
      <DatePicker
        ref={ref}
        selected={currentDate}
        onChange={(date) => onChange(date)}
        locale={vi}
        dateFormat="dd/MM/yyyy HH:mm"
        customInput={<CustomInput placeholder={placeholder} />}
        isClearable
        wrapperClassName="w-full"
        {...props}
      >
        {/* Custom Time Picker */}
        <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-200 bg-slate-50 mt-2">
          <span className="text-sm font-medium text-slate-700">Thời gian:</span>
          <select 
            value={currentHour} 
            onChange={e => handleTimeChange('hour', Number(e.target.value))}
            className="p-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm cursor-pointer"
          >
            {Array.from({length: 24}).map((_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="font-bold text-slate-400">:</span>
          <select 
            value={currentMinute} 
            onChange={e => handleTimeChange('minute', Number(e.target.value))}
            className="p-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm cursor-pointer"
          >
            {Array.from({length: 60}).map((_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </DatePicker>
    );
  }
);

AppDatePicker.displayName = 'AppDatePicker';

export default AppDatePicker;
