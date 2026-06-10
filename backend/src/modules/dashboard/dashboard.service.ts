import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** Thống kê tổng quan */
  async getOverview() {
    const [
      totalStudents,
      totalExamSessions,
      totalSubjects,
      totalExams,
      totalQuestions,
      avgScoreResult,
    ] = await Promise.all([
      // Tổng học sinh unique (theo tên + lớp)
      this.prisma.examSession.groupBy({
        by: ['studentName', 'studentClass'],
        _count: true,
      }),
      // Tổng lượt thi
      this.prisma.examSession.count({
        where: { status: { in: ['SUBMITTED', 'TIMED_OUT'] } },
      }),
      // Tổng môn học
      this.prisma.subject.count(),
      // Tổng đề thi
      this.prisma.exam.count(),
      // Tổng câu hỏi
      this.prisma.question.count(),
      // Điểm trung bình
      this.prisma.examResult.aggregate({
        _avg: { score: true },
      }),
    ]);

    // Thống kê theo môn
    const subjectStats = await this.prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            exams: true,
          },
        },
      },
    });

    // Thống kê đề thi popular (nhiều lượt thi nhất)
    const popularExams = await this.prisma.exam.findMany({
      take: 5,
      orderBy: {
        examSessions: { _count: 'desc' },
      },
      select: {
        id: true,
        title: true,
        subject: { select: { name: true } },
        _count: { select: { examSessions: true } },
      },
    });

    // Kết quả gần đây
    const recentResults = await this.prisma.examSession.findMany({
      where: { result: { isNot: null } },
      take: 10,
      orderBy: { submittedAt: 'desc' },
      select: {
        studentName: true,
        studentClass: true,
        submittedAt: true,
        exam: { select: { title: true } },
        result: { select: { score: true, correctAnswers: true, totalQuestions: true } },
      },
    });

    return {
      totalStudents: totalStudents.length,
      totalExamSessions,
      totalSubjects,
      totalExams,
      totalQuestions,
      averageScore: avgScoreResult._avg.score
        ? Math.round(avgScoreResult._avg.score * 100) / 100
        : 0,
      subjectStats,
      popularExams,
      recentResults,
    };
  }

  /** Dữ liệu biểu đồ theo ngày/tháng */
  async getChartData(type: 'daily' | 'monthly' = 'daily', days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.examSession.findMany({
      where: {
        submittedAt: { gte: startDate },
        status: { in: ['SUBMITTED', 'TIMED_OUT'] },
      },
      include: {
        result: { select: { score: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    // Group by date
    const groupedData = new Map<
      string,
      { count: number; totalScore: number }
    >();

    for (const session of sessions) {
      if (!session.submittedAt) continue;

      const date = session.submittedAt;
      let key: string;

      if (type === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }

      const existing = groupedData.get(key) || { count: 0, totalScore: 0 };
      existing.count++;
      if (session.result) {
        existing.totalScore += session.result.score;
      }
      groupedData.set(key, existing);
    }

    const chartData = Array.from(groupedData.entries()).map(
      ([date, { count, totalScore }]) => ({
        date,
        count,
        averageScore: count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0,
      }),
    );

    return chartData;
  }
}
