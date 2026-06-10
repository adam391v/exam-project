import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateExamDto,
  UpdateExamDto,
  ExamFilterDto,
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
} from './dto/exam.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  // ==================== PUBLIC ====================

  /** Public: Lấy danh sách đề thi đã công khai */
  async findAllPublic(subjectId?: string, search?: string) {
    const where: any = {
      status: 'PUBLISHED',
      isPublic: true,
    };

    if (subjectId) where.subjectId = subjectId;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.exam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        duration: true,
        totalQuestions: true,
        description: true,
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { examSessions: true } },
      },
    });
  }

  /** Public: Chi tiết đề thi (không trả đáp án đúng) */
  async findOnePublic(id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, status: 'PUBLISHED', isPublic: true },
      select: {
        id: true,
        title: true,
        duration: true,
        totalQuestions: true,
        description: true,
        showAnswer: true,
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    return exam;
  }

  // ==================== ADMIN: EXAM CRUD ====================

  /** Admin: Danh sách đề thi có phân trang */
  async findAll(query: ExamFilterDto) {
    const { page = 1, limit = 10, search, subjectId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          _count: { select: { questions: true, examSessions: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  /** Admin: Chi tiết đề thi kèm danh sách câu hỏi */
  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
        },
        _count: { select: { examSessions: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    return exam;
  }

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        ...dto,
        totalQuestions: 0,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findOne(id);
    return this.prisma.exam.update({
      where: { id },
      data: dto,
      include: {
        subject: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.exam.delete({ where: { id } });
  }

  /** Công khai đề thi */
  async publish(id: string) {
    const exam = await this.findOne(id);

    if (exam.questions.length === 0) {
      throw new BadRequestException(
        'Đề thi phải có ít nhất 1 câu hỏi trước khi công khai',
      );
    }

    return this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED', isPublic: true },
    });
  }

  // ==================== ADMIN: QUESTION CRUD (thuộc Exam) ====================

  /** Thêm câu hỏi vào đề thi */
  async addQuestion(examId: string, dto: CreateExamQuestionDto) {
    await this.findOne(examId);

    // Lấy sortOrder tiếp theo
    const lastQuestion = await this.prisma.question.findFirst({
      where: { examId },
      orderBy: { sortOrder: 'desc' },
    });
    const nextOrder = (lastQuestion?.sortOrder ?? -1) + 1;

    const question = await this.prisma.question.create({
      data: {
        examId,
        content: dto.content,
        explanation: dto.explanation,
        type: (dto.type as any) || 'SINGLE_CHOICE',
        sortOrder: dto.sortOrder ?? nextOrder,
        options: {
          create: dto.options.map((opt, index) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect ?? false,
            sortOrder: opt.sortOrder ?? index,
          })),
        },
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Cập nhật totalQuestions
    await this.syncTotalQuestions(examId);

    return question;
  }

  /** Sửa câu hỏi */
  async updateQuestion(
    examId: string,
    questionId: string,
    dto: UpdateExamQuestionDto,
  ) {
    // Verify ownership
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, examId },
    });
    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong đề thi');
    }

    const { options, ...questionData } = dto;

    if (options) {
      // Xoá options cũ + tạo mới
      await this.prisma.questionOption.deleteMany({
        where: { questionId },
      });

      return this.prisma.question.update({
        where: { id: questionId },
        data: {
          ...questionData,
          type: questionData.type as any,
          options: {
            create: options.map((opt, index) => ({
              label: opt.label,
              content: opt.content,
              isCorrect: opt.isCorrect ?? false,
              sortOrder: opt.sortOrder ?? index,
            })),
          },
        },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: { ...questionData, type: questionData.type as any },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  /** Xoá câu hỏi khỏi đề thi */
  async removeQuestion(examId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, examId },
    });
    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong đề thi');
    }

    await this.prisma.question.delete({ where: { id: questionId } });

    // Cập nhật totalQuestions
    await this.syncTotalQuestions(examId);

    return { deleted: true };
  }

  /** Import nhiều câu hỏi vào đề thi */
  async bulkCreateQuestions(
    examId: string,
    questions: Array<{
      content: string;
      options: Array<{ label: string; content: string; isCorrect: boolean }>;
      explanation?: string;
      type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    }>,
  ) {
    await this.findOne(examId);

    // Lấy sortOrder hiện tại
    const lastQuestion = await this.prisma.question.findFirst({
      where: { examId },
      orderBy: { sortOrder: 'desc' },
    });
    let currentOrder = (lastQuestion?.sortOrder ?? -1) + 1;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let i = 0; i < questions.length; i++) {
      try {
        const q = questions[i];
        await this.prisma.question.create({
          data: {
            examId,
            content: q.content,
            type: q.type || 'SINGLE_CHOICE',
            explanation: q.explanation,
            sortOrder: currentOrder++,
            options: {
              create: q.options.map((opt, idx) => ({
                label: opt.label,
                content: opt.content,
                isCorrect: opt.isCorrect,
                sortOrder: idx,
              })),
            },
          },
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          message:
            error instanceof Error ? error.message : 'Lỗi không xác định',
        });
      }
    }

    // Cập nhật totalQuestions
    await this.syncTotalQuestions(examId);

    return results;
  }

  // ==================== HELPERS ====================

  /** Đồng bộ totalQuestions theo số câu thực tế */
  private async syncTotalQuestions(examId: string) {
    const count = await this.prisma.question.count({ where: { examId } });
    await this.prisma.exam.update({
      where: { id: examId },
      data: { totalQuestions: count },
    });
  }
}
