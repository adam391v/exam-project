import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StartExamDto, SaveAnswerDto } from './dto/exam-session.dto';

@Injectable()
export class ExamSessionService {
  constructor(private prisma: PrismaService) {}

  /** Bắt đầu phiên thi */
  async startExam(dto: StartExamDto, ipAddress?: string, userAgent?: string) {
    // Kiểm tra đề thi tồn tại và đã publish
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.examId, status: 'PUBLISHED', isPublic: true },
      include: {
        questions: {
          where: { groupId: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, content: true, sortOrder: true },
            },
          },
        },
        questionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, label: true, content: true, sortOrder: true },
                },
              },
            },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Đề thi không tồn tại hoặc chưa được công khai');
    }

    // Xác định studentClass
    let studentClass = dto.studentClass || '';
    let classroomId: string | null = null;

    if (dto.classroomId) {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: dto.classroomId },
      });
      if (classroom) {
        studentClass = classroom.name;
        classroomId = classroom.id;
      }
    }

    if (!studentClass) {
      throw new NotFoundException('Vui lòng chọn lớp hoặc nhập tên lớp');
    }

    // Cấu trúc items: giữ nguyên group thay vì flatten
    const items = this.structureItems(exam.questions, exam.questionGroups);

    // Lấy tất cả question IDs (câu đơn + câu con trong group)
    const allQuestionIds = this.extractAllQuestionIds(items);

    // Tạo phiên thi
    const session = await this.prisma.examSession.create({
      data: {
        examId: dto.examId,
        studentName: dto.studentName,
        studentClass,
        classroomId,
        ipAddress,
        userAgent,
      },
    });

    // Tạo sẵn các ExamAnswer records (chưa chọn đáp án)
    await this.prisma.examAnswer.createMany({
      data: allQuestionIds.map((qId) => ({
        sessionId: session.id,
        questionId: qId,
      })),
    });

    // Shuffle items nếu cần (giữ nguyên group, chỉ đổi thứ tự items)
    let shuffledItems = items;
    if (exam.shuffleQuestions) {
      shuffledItems = this.shuffle(shuffledItems);
    }

    // Shuffle đáp án nếu cần
    if (exam.shuffleOptions) {
      shuffledItems = shuffledItems.map((item) => {
        if (item.type === 'single') {
          return { ...item, options: this.shuffle([...item.options]) };
        }
        return {
          ...item,
          subQuestions: item.subQuestions.map((sq: any) => ({
            ...sq,
            options: this.shuffle([...sq.options]),
          })),
        };
      });
    }

    return {
      sessionId: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        duration: exam.duration,
        totalQuestions: allQuestionIds.length,
        subject: exam.subject,
      },
      student: {
        name: dto.studentName,
        class: studentClass,
      },
      questions: shuffledItems,
      startedAt: session.startedAt,
    };
  }

  /** Lưu đáp án (auto-save) */
  async saveAnswer(sessionId: string, dto: SaveAnswerDto) {
    await this.validateSession(sessionId);

    const updateData: any = {};
    if (dto.selectedOptionId !== undefined) {
      updateData.selectedOptionId = dto.selectedOptionId;
    }
    if (dto.textAnswer !== undefined) {
      updateData.textAnswer = dto.textAnswer;
    }
    if (dto.isMarked !== undefined) {
      updateData.isMarked = dto.isMarked;
    }
    if (dto.isViewed !== undefined) {
      updateData.isViewed = dto.isViewed;
    }

    await this.prisma.examAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
      update: updateData,
      create: {
        sessionId,
        questionId: dto.questionId,
        ...updateData,
      },
    });

    return { saved: true };
  }

  /** Nộp bài */
  async submitExam(sessionId: string) {
    const session = await this.validateSession(sessionId);

    // Lấy tất cả đáp án của phiên thi
    const answers = await this.prisma.examAnswer.findMany({
      where: { sessionId },
      include: {
        selectedOption: true,
      },
    });

    // Lấy đáp án đúng từ database (trực tiếp từ questions)
    const examQuestions = await this.prisma.question.findMany({
      where: { examId: session.examId },
      include: {
        options: { where: { isCorrect: true } },
      },
    });

    // Chấm điểm
    const normalize = (s: string) => s.trim().toLowerCase();
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    for (const q of examQuestions) {
      const answer = answers.find((a) => a.questionId === q.id);

      if (q.type === 'FILL_IN_BLANK') {
        // Câu điền đáp án: so sánh textAnswer (mảng JSON) với options
        let textArr: string[] = [];
        try {
          textArr = JSON.parse(answer?.textAnswer || '[]');
          if (!Array.isArray(textArr)) textArr = [];
        } catch {
          textArr = [];
        }

        const hasAnyAnswer = textArr.some(a => a && a.trim());
        if (!hasAnyAnswer) {
          unanswered++;
          continue;
        }

        // Phải trả lời đúng tất cả các ô trống
        let isCorrect = true;
        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          const ans = textArr[i] || '';
          if (normalize(opt.content) !== normalize(ans)) {
            isCorrect = false;
            break;
          }
        }

        if (isCorrect) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      } else {
        // Câu trắc nghiệm: so sánh selectedOptionId
        if (!answer || !answer.selectedOptionId) {
          unanswered++;
          continue;
        }
        const correctOptionIds = q.options.map((o) => o.id);
        if (correctOptionIds.includes(answer.selectedOptionId)) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      }
    }

    const totalQuestions = examQuestions.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 10 * 100) / 100
        : 0;

    // Tính thời gian làm bài (giây)
    const timeTaken = Math.floor(
      (new Date().getTime() - new Date(session.startedAt).getTime()) / 1000,
    );

    // Lấy passing score
    const exam = await this.prisma.exam.findUnique({
      where: { id: session.examId },
    });

    const isPassed = exam?.passingScore ? score >= exam.passingScore : null;

    // Tạo kết quả
    const result = await this.prisma.examResult.create({
      data: {
        sessionId,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        score,
        timeTaken,
        isPassed,
      },
    });

    // Cập nhật trạng thái phiên thi
    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return {
      resultId: result.id,
      sessionId,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      score,
      timeTaken,
      isPassed,
    };
  }

  /** Lấy trạng thái phiên thi (dùng khi refresh recovery) */
  async getSessionStatus(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            questions: {
              where: { groupId: null },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                content: true,
                imageUrl: true,
                latex: true,
                type: true,
                options: {
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, label: true, content: true, sortOrder: true },
                },
              },
            },
            questionGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                questions: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    content: true,
                    imageUrl: true,
                    latex: true,
                    type: true,
                    options: {
                      orderBy: { sortOrder: 'asc' },
                      select: { id: true, label: true, content: true, sortOrder: true },
                    },
                  },
                },
              },
            },
          },
        },
        answers: {
          select: {
            questionId: true,
            selectedOptionId: true,
            isMarked: true,
            isViewed: true,
          },
        },
        result: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên thi');
    }

    // Cấu trúc items: giữ nguyên group
    const items = this.structureItems(
      session.exam.questions as any[],
      session.exam.questionGroups as any[],
    );
    const allQuestionIds = this.extractAllQuestionIds(items);

    // Kiểm tra hết giờ
    const elapsedSeconds = Math.floor(
      (new Date().getTime() - new Date(session.startedAt).getTime()) / 1000,
    );
    const durationSeconds = session.exam.duration * 60;
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);

    // Nếu hết giờ và chưa nộp → tự động nộp
    if (remainingSeconds <= 0 && session.status === 'IN_PROGRESS') {
      const submitResult = await this.submitExam(sessionId);
      return {
        ...submitResult,
        status: 'TIMED_OUT',
        autoSubmitted: true,
      };
    }

    return {
      sessionId: session.id,
      status: session.status,
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        duration: session.exam.duration,
        totalQuestions: allQuestionIds.length,
        subject: session.exam.subject,
      },
      student: {
        name: session.studentName,
        class: session.studentClass,
      },
      questions: items,
      answers: session.answers,
      startedAt: session.startedAt,
      remainingSeconds,
      result: session.result,
    };
  }

  /** Validate phiên thi đang hoạt động */
  private async validateSession(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên thi');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new ForbiddenException('Phiên thi đã kết thúc');
    }

    // Kiểm tra hết giờ
    const elapsed = Math.floor(
      (new Date().getTime() - new Date(session.startedAt).getTime()) / 1000,
    );
    const duration = session.exam.duration * 60;

    if (elapsed > duration) {
      throw new ForbiddenException('Đã hết thời gian làm bài');
    }

    return session;
  }

  /** Cấu trúc items: giữ nguyên group, mỗi item là 'single' hoặc 'group' */
  private structureItems(standaloneQuestions: any[], questionGroups: any[]) {
    const items: any[] = [];

    for (const q of standaloneQuestions) {
      items.push({
        type: 'single',
        sortOrder: q.sortOrder ?? 0,
        id: q.id,
        content: q.content,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        youtubeUrl: q.youtubeUrl,
        latex: q.latex,
        questionType: q.type,
        options: q.type === 'FILL_IN_BLANK' ? q.options.map((o: any) => ({ id: o.id })) : q.options,
      });
    }

    for (const g of questionGroups) {
      items.push({
        type: 'group',
        sortOrder: g.sortOrder ?? 0,
        id: g.id,
        groupContent: g.content,
        groupTitle: g.title,
        groupImageUrl: g.imageUrl,
        groupAudioUrl: g.audioUrl,
        groupYoutubeUrl: g.youtubeUrl,
        subQuestions: (g.questions || []).map((q: any) => ({
          id: q.id,
          content: q.content,
          imageUrl: q.imageUrl,
          latex: q.latex,
          questionType: q.type,
          options: q.type === 'FILL_IN_BLANK' ? q.options.map((o: any) => ({ id: o.id })) : q.options,
        })),
      });
    }

    // Sắp xếp theo sortOrder
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    return items;
  }

  /** Lấy tất cả question IDs từ structured items (cho ExamAnswer creation) */
  private extractAllQuestionIds(items: any[]): string[] {
    const ids: string[] = [];
    for (const item of items) {
      if (item.type === 'single') {
        ids.push(item.id);
      } else if (item.type === 'group') {
        for (const sq of item.subQuestions) {
          ids.push(sq.id);
        }
      }
    }
    return ids;
  }

  /** Fisher-Yates shuffle */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /** Ghi nhận vi phạm: rời tab/thoát fullscreen */
  async reportViolation(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      return { tabSwitchCount: session?.tabSwitchCount ?? 0 };
    }

    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { tabSwitchCount: { increment: 1 } },
    });

    return { tabSwitchCount: updated.tabSwitchCount };
  }
}
