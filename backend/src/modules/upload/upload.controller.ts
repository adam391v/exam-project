import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

// Cấu hình lưu file
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Tự tạo thư mục nếu chưa có
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Danh sách MIME types cho phép
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`File không hợp lệ. Chỉ hỗ trợ: ảnh (jpg, png, gif, webp, svg), audio (mp3, wav, ogg, mp4, webm, aac)`), false);
  }
};

@Controller('api/uploads')
export class UploadController {
  /** Upload file (image hoặc audio) */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file');
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.mimetype);

    return {
      url: `/api/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      type: isImage ? 'image' : isAudio ? 'audio' : 'unknown',
    };
  }

  /** Serve file tĩnh (để frontend hiển thị) */
  @Get(':filename')
  getFile(@Param('filename') filename: string, @Res() res: any) {
    // Chặn path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    const filePath = join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      throw new BadRequestException('File không tồn tại');
    }

    return res.sendFile(filePath);
  }
}
