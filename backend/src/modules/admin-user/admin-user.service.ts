import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';
import { hashPassword } from '../../utils/hash.util';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminUserService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async create(dto: CreateAdminUserDto) {
    // Kiểm tra username trùng
    const existing = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const hashedPassword = await hashPassword(dto.password);

    return this.prisma.adminUser.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    await this.findOne(id);

    const data: any = { ...dto };

    if (dto.password) {
      data.password = await hashPassword(dto.password);
    }

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.adminUser.delete({ where: { id } });
  }
}
