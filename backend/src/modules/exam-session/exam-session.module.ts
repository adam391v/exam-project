import { Module } from '@nestjs/common';
import { ExamSessionController } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';

@Module({
  controllers: [ExamSessionController],
  providers: [ExamSessionService],
  exports: [ExamSessionService],
})
export class ExamSessionModule {}
