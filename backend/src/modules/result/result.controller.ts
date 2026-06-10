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
  findGrouped(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.resultService.findGroupedByClass({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/results/class-detail')
  findByClassAndExam(
    @Query('studentClass') studentClass: string,
    @Query('examId') examId: string,
  ) {
    return this.resultService.findByClassAndExam(studentClass, examId);
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
