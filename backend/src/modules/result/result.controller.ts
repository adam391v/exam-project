import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResultService } from './result.service';

@Controller('api')
export class ResultController {
  constructor(private resultService: ResultService) {}

  // ===== PUBLIC =====

  @Get('results/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.resultService.findBySession(sessionId);
  }

  // ===== ADMIN =====

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/results')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('subjectId') subjectId?: string,
    @Query('examId') examId?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.resultService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      subjectId,
      examId,
      search,
      fromDate,
      toDate,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/results/:id')
  findDetail(@Param('id') id: string) {
    return this.resultService.findDetail(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/results/:id')
  remove(@Param('id') id: string) {
    return this.resultService.remove(id);
  }
}
