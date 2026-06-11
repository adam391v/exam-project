import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadService } from '../services/data.service';
import { toast } from 'sonner';

interface FileUploadInputProps {
  /** Loại file: 'image' hoặc 'audio' */
  type: 'image' | 'audio';
  /** URL hiện tại (có thể là URL ngoài hoặc URL đã upload) */
  value: string;
  /** Callback khi URL thay đổi (sau upload hoặc nhập tay) */
  onChange: (url: string) => void;
  /** Placeholder cho input URL */
  placeholder?: string;
}

const ACCEPT_MAP = {
  image: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
  audio: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm,audio/aac',
};

const LABEL_MAP = {
  image: 'Hình ảnh',
  audio: 'Audio',
};

export default function FileUploadInput({ type, value, onChange, placeholder }: FileUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadService.upload(file);
      onChange(result.url);
      toast.success(`Upload ${LABEL_MAP[type]} thành công`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Lỗi upload ${LABEL_MAP[type]}`);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Xây URL tuyệt đối từ URL tương đối (cho preview)
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // URL tương đối từ backend → gắn baseURL
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
  };

  return (
    <div className="space-y-2">
      {/* URL input + upload button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder || `URL ${LABEL_MAP[type]} hoặc upload file...`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-all border border-blue-200 flex-shrink-0"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Upload
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
            title="Xoá"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MAP[type]}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview */}
      {value && (
        <div className="mt-1">
          {type === 'image' && (
            <img
              src={getFullUrl(value)}
              alt="Preview"
              className="max-h-24 rounded-lg border border-slate-200 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {type === 'audio' && (
            <audio controls className="h-8 w-full max-w-xs">
              <source src={getFullUrl(value)} />
            </audio>
          )}
        </div>
      )}
    </div>
  );
}
