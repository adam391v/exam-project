import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ResultService {
  constructor(private prisma: PrismaService) {}

  /** Public: Xem kết quả qua sessionId */
  async findBySession(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        result: true,
      },
    });

    if (!session || !session.result) {
      throw new NotFoundException('Không tìm thấy kết quả');
    }

    const response: any = {
      session: {
        id: session.id,
        studentName: session.studentName,
        studentClass: session.studentClass,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt,
      },
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        subject: session.exam.subject,
      },
      result: session.result,
    };

    // Nếu admin cho phép xem đáp án
    if (session.exam.showAnswer) {
      const answers = await this.prisma.examAnswer.findMany({
        where: { sessionId },
        include: {
          selectedOption: true,
        },
      });

      // Lấy câu hỏi trực tiếp từ exam
      const questions = await this.prisma.question.findMany({
        where: { examId: session.examId },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      response.review = questions.map((q) => {
        const answer = answers.find((a) => a.questionId === q.id);
        return {
          question: {
            id: q.id,
            content: q.content,
            imageUrl: q.imageUrl,
            latex: q.latex,
            explanation: q.explanation,
          },
          options: q.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
          })),
          selectedOptionId: answer?.selectedOptionId || null,
          isCorrect: answer?.selectedOptionId
            ? q.options.some(
                (o) => o.id === answer.selectedOptionId && o.isCorrect,
              )
            : false,
        };
      });
    }

    return response;
  }

  /** Admin: Danh sách kết quả có phân trang + filter */
  async findAll(query: {
    page?: number;
    limit?: number;
    subjectId?: string;
    examId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      subjectId,
      examId,
      search,
      fromDate,
      toDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      result: { isNot: null },
    };

    if (examId) where.examId = examId;
    if (subjectId) where.exam = { subjectId };
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentClass: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = new Date(fromDate);
      if (toDate) where.submittedAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.examSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              subject: { select: { id: true, name: true } },
            },
          },
          result: true,
        },
      }),
      this.prisma.examSession.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  /** Admin: Xem chi tiết bài làm */
  async findDetail(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        answers: {
          include: { selectedOption: true },
        },
        result: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy bài làm');
    }

    // Lấy câu hỏi trực tiếp từ exam
    const questions = await this.prisma.question.findMany({
      where: { examId: session.examId },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      session: {
        id: session.id,
        studentName: session.studentName,
        studentClass: session.studentClass,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt,
        status: session.status,
      },
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        subject: session.exam.subject,
      },
      result: session.result,
      details: questions.map((q) => {
        const answer = session.answers.find(
          (a) => a.questionId === q.id,
        );
        return {
          question: q,
          selectedOptionId: answer?.selectedOptionId || null,
          isCorrect: answer?.selectedOptionId
            ? q.options.some(
                (o) => o.id === answer.selectedOptionId && o.isCorrect,
              )
            : false,
        };
      }),
    };
  }

  async remove(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên thi');
    }
    return this.prisma.examSession.delete({ where: { id: sessionId } });
  }
}
