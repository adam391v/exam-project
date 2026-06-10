import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamService } from './exam.service';
import { ImportService } from './import.service';
import {
  CreateExamDto,
  UpdateExamDto,
  ExamFilterDto,
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
} from './dto/exam.dto';

@Controller('api')
export class ExamController {
  constructor(
    private examService: ExamService,
    private importService: ImportService,
  ) {}

  // ===== PUBLIC =====

  @Get('exams')
  findAllPublic(
    @Query('subjectId') subjectId?: string,
    @Query('search') search?: string,
  ) {
    return this.examService.findAllPublic(subjectId, search);
  }

  @Get('exams/:id')
  findOnePublic(@Param('id') id: string) {
    return this.examService.findOnePublic(id);
  }

  // ===== ADMIN: EXAM CRUD =====

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/exams')
  findAll(@Query() query: ExamFilterDto) {
    return this.examService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/exams/:id')
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/exams')
  create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/exams/:id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/exams/:id')
  remove(@Param('id') id: string) {
    return this.examService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/exams/:id/publish')
  publish(@Param('id') id: string) {
    return this.examService.publish(id);
  }

  // ===== ADMIN: QUESTION CRUD (trong đề thi) =====

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/exams/:examId/questions')
  addQuestion(
    @Param('examId') examId: string,
    @Body() dto: CreateExamQuestionDto,
  ) {
    return this.examService.addQuestion(examId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/exams/:examId/questions/:questionId')
  updateQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamQuestionDto,
  ) {
    return this.examService.updateQuestion(examId, questionId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/exams/:examId/questions/:questionId')
  removeQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.examService.removeQuestion(examId, questionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/exams/:examId/questions/import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)'),
            false,
          );
        }
      },
    }),
  )
  async importExcel(
    @Param('examId') examId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file Excel');
    }

    const parseResult = this.importService.parseExcel(file.buffer);

    if (parseResult.questions.length === 0) {
      return {
        success: true,
        data: {
          imported: 0,
          failed: parseResult.errors.length,
          errors: parseResult.errors,
        },
        message: 'Không có câu hỏi hợp lệ để import',
      };
    }

    const importResult = await this.examService.bulkCreateQuestions(
      examId,
      parseResult.questions,
    );

    const allErrors = [...parseResult.errors, ...importResult.errors];

    return {
      success: true,
      data: {
        imported: importResult.success,
        failed: importResult.failed + parseResult.errors.length,
        total: parseResult.questions.length + parseResult.errors.length,
        errors: allErrors,
      },
      message: `Import thành công ${importResult.success} câu hỏi`,
    };
  }
}
