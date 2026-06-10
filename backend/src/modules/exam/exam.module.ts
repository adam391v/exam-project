import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ImportService } from './import.service';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [ExamController],
  providers: [ExamService, ImportService],
  exports: [ExamService],
})
export class ExamModule {}
