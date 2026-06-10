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
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                label: true,
                content: true,
                sortOrder: true,
                // KHÔNG trả isCorrect
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
    const answerRecords = exam.questions.map((q) => ({
      sessionId: session.id,
      questionId: q.id,
    }));

    await this.prisma.examAnswer.createMany({
      data: answerRecords,
    });

    // Trả về thông tin cần thiết (KHÔNG có đáp án đúng)
    let questions = exam.questions.map((q) => ({
      id: q.id,
      content: q.content,
      imageUrl: q.imageUrl,
      latex: q.latex,
      type: q.type,
      options: q.options,
    }));

    // Shuffle câu hỏi nếu cần
    if (exam.shuffleQuestions) {
      questions = this.shuffle(questions);
    }

    // Shuffle đáp án nếu cần
    if (exam.shuffleOptions) {
      questions = questions.map((q) => ({
        ...q,
        options: this.shuffle([...q.options]),
      }));
    }

    return {
      sessionId: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        duration: exam.duration,
        totalQuestions: exam.totalQuestions,
        subject: exam.subject,
      },
      student: {
        name: dto.studentName,
        class: dto.studentClass,
      },
      questions,
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
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    for (const q of examQuestions) {
      const answer = answers.find((a) => a.questionId === q.id);

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
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                content: true,
                imageUrl: true,
                latex: true,
                type: true,
                options: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    label: true,
                    content: true,
                    sortOrder: true,
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
        totalQuestions: session.exam.totalQuestions,
        subject: session.exam.subject,
      },
      student: {
        name: session.studentName,
        class: session.studentClass,
      },
      questions: session.exam.questions,
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

  /** Fisher-Yates shuffle */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
