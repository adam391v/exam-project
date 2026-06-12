import { AlertTriangle, X } from 'lucide-react';
import AppButton from './AppButton';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            </div>
            <button 
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-4 text-slate-600 leading-relaxed pl-12">
            {message}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <AppButton variant="secondary" onClick={onCancel}>
            {cancelText}
          </AppButton>
          <AppButton 
            variant={isDestructive ? 'danger' : 'primary'} 
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmText}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
