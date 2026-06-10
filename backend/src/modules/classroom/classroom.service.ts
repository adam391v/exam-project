import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ClassroomService {
  constructor(private prisma: PrismaService) {}

  /** Public: Lấy danh sách lớp theo khối */
  async findByGrade(grade: number) {
    return this.prisma.classroom.findMany({
      where: { grade, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, grade: true },
    });
  }

  /** Public: Lấy danh sách khối có lớp học */
  async findGrades() {
    const result = await this.prisma.classroom.groupBy({
      by: ['grade'],
      where: { isActive: true },
      _count: true,
      orderBy: { grade: 'asc' },
    });
    return result.map((r) => ({ grade: r.grade, count: r._count }));
  }

  /** Admin: Danh sách có phân trang + filter */
  async findAll(query: PaginationDto & { grade?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search, sortBy = 'grade', sortOrder = 'asc' } = query;
    const grade = query.grade ? Number(query.grade) : undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (grade) where.grade = grade;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.classroom.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy === 'grade' ? [{ grade: sortOrder as any }, { sortOrder: 'asc' }] : { [sortBy]: sortOrder },
        include: {
          _count: { select: { examSessions: true } },
        },
      }),
      this.prisma.classroom.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const classroom = await this.prisma.classroom.findUnique({ where: { id } });
    if (!classroom) throw new NotFoundException('Không tìm thấy lớp học');
    return classroom;
  }

  async create(dto: CreateClassroomDto) {
    // Kiểm tra trùng
    const existing = await this.prisma.classroom.findUnique({
      where: { name_grade: { name: dto.name, grade: dto.grade } },
    });
    if (existing) throw new ConflictException(`Lớp "${dto.name}" khối ${dto.grade} đã tồn tại`);

    return this.prisma.classroom.create({ data: dto });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    await this.findOne(id);

    // Kiểm tra trùng nếu thay đổi name hoặc grade
    if (dto.name || dto.grade) {
      const current = await this.prisma.classroom.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Không tìm thấy lớp học');
      const name = dto.name || current.name;
      const grade = dto.grade || current.grade;
      const existing = await this.prisma.classroom.findFirst({
        where: { name, grade, NOT: { id } },
      });
      if (existing) throw new ConflictException(`Lớp "${name}" khối ${grade} đã tồn tại`);
    }

    return this.prisma.classroom.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.classroom.delete({ where: { id } });
  }
}
