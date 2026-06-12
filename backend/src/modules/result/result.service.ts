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

      // Lấy câu hỏi trực tiếp từ exam (bao gồm group info)
      const questions = await this.prisma.question.findMany({
        where: { examId: session.examId },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          group: { select: { id: true, title: true, content: true, imageUrl: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      response.review = questions.map((q) => {
        const answer = answers.find((a) => a.questionId === q.id);

        // Tính isCorrect tuỳ theo loại câu hỏi
        let isCorrect = false;
        if (q.type === 'FILL_IN_BLANK') {
          let textArr: string[] = [];
          try {
            textArr = JSON.parse(answer?.textAnswer || '[]');
            if (!Array.isArray(textArr)) textArr = [];
          } catch {
            textArr = [];
          }
          const hasAnyAnswer = textArr.some(a => a && a.trim());
          if (hasAnyAnswer) {
            isCorrect = true;
            const normalize = (s: string) => s.trim().toLowerCase();
            for (let i = 0; i < q.options.length; i++) {
              const opt = q.options[i];
              const ans = textArr[i] || '';
              if (normalize(opt.content) !== normalize(ans)) {
                isCorrect = false;
                break;
              }
            }
          }
        } else {
          isCorrect = answer?.selectedOptionId
            ? q.options.some(
                (o) => o.id === answer.selectedOptionId && o.isCorrect,
              )
            : false;
        }

        return {
          question: {
            id: q.id,
            content: q.content,
            imageUrl: q.imageUrl,
            latex: q.latex,
            explanation: q.explanation,
            type: q.type,
            groupId: q.group?.id,
            groupContent: q.group?.content,
            groupTitle: q.group?.title,
            groupImageUrl: q.group?.imageUrl,
          },
          options: q.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
          })),
          selectedOptionId: answer?.selectedOptionId || null,
          textAnswer: answer?.textAnswer || null,
          isCorrect,
        };
      });
    }

    return response;
  }

  /** Admin: Kết quả nhóm theo lớp + đề thi */
  async findGroupedByClass(query: {
    page?: number;
    limit?: number;
    search?: string;
    studentClass?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, studentClass } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      result: { isNot: null },
    };
    if (studentClass) {
      where.studentClass = studentClass;
    }
    if (search) {
      where.OR = [
        { studentClass: { contains: search, mode: 'insensitive' } },
        { exam: { title: { contains: search, mode: 'insensitive' } } },
        { exam: { subject: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    // Lấy tất cả sessions đã có result, group trong JS
    const allSessions = await this.prisma.examSession.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        studentClass: true,
        examId: true,
        submittedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            subject: { select: { id: true, name: true } },
          },
        },
        result: {
          select: { score: true, correctAnswers: true, totalQuestions: true },
        },
      },
    });

    // Group theo studentClass + examId
    const groupMap = new Map<string, any>();
    for (const s of allSessions) {
      const key = `${s.studentClass}___${s.examId}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          studentClass: s.studentClass,
          examId: s.examId,
          examTitle: s.exam.title,
          subjectName: s.exam.subject?.name || '',
          studentCount: 0,
          avgScore: 0,
          totalScore: 0,
          latestDate: s.submittedAt,
        });
      }
      const group = groupMap.get(key)!;
      group.studentCount++;
      group.totalScore += s.result?.score || 0;
      if (s.submittedAt && (!group.latestDate || s.submittedAt > group.latestDate)) {
        group.latestDate = s.submittedAt;
      }
    }

    const allGroups = Array.from(groupMap.values()).map(g => ({
      ...g,
      avgScore: g.studentCount > 0 ? Math.round((g.totalScore / g.studentCount) * 10) / 10 : 0,
    }));
    // Sắp xếp theo ngày thi mới nhất
    allGroups.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

    const total = allGroups.length;
    const data = allGroups.slice(skip, skip + limit);

    return new PaginatedResult(data, total, page, limit);
  }

  /** Admin: Chi tiết kết quả 1 lớp + 1 đề thi */
  async findByClassAndExam(studentClass: string, examId: string) {
    const sessions = await this.prisma.examSession.findMany({
      where: {
        studentClass,
        examId,
        result: { isNot: null },
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            duration: true,
            subject: { select: { id: true, name: true } },
          },
        },
        result: true,
      },
    });

    return sessions;
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
