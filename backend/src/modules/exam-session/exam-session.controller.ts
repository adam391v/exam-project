import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';
import { StartExamDto, SaveAnswerDto } from './dto/exam-session.dto';

@Controller('api/exam-sessions')
export class ExamSessionController {
  constructor(private examSessionService: ExamSessionService) {}

  @Post('start')
  startExam(@Body() dto: StartExamDto, @Req() req: any) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.examSessionService.startExam(dto, ipAddress, userAgent);
  }

  @Post(':id/answer')
  saveAnswer(@Param('id') id: string, @Body() dto: SaveAnswerDto) {
    return this.examSessionService.saveAnswer(id, dto);
  }

  @Post(':id/submit')
  submitExam(@Param('id') id: string) {
    return this.examSessionService.submitExam(id);
  }

  @Get(':id/status')
  getSessionStatus(@Param('id') id: string) {
    return this.examSessionService.getSessionStatus(id);
  }

  @Post(':id/violation')
  reportViolation(@Param('id') id: string) {
    return this.examSessionService.reportViolation(id);
  }
}
