import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { Subject } from '@prisma/client';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  /** Public: Lấy danh sách môn học active */
  async findAllPublic() {
    return this.prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        _count: {
          select: { exams: { where: { status: 'PUBLISHED', isPublic: true } } },
        },
      },
    });
  }

  /** Admin: Lấy danh sách môn học có phân trang */
  async findAll(query: PaginationDto): Promise<PaginatedResult<Subject>> {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { exams: true },
          },
        },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { exams: true },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Không tìm thấy môn học');
    }

    return subject;
  }

  async create(dto: CreateSubjectDto) {
    // Kiểm tra mã môn học trùng
    const existing = await this.prisma.subject.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Mã môn học đã tồn tại');
    }

    return this.prisma.subject.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);

    // Kiểm tra mã môn trùng (nếu có thay đổi)
    if (dto.code) {
      const existing = await this.prisma.subject.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Mã môn học đã tồn tại');
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subject.delete({ where: { id } });
  }
}
