import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('api')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  // ===== PUBLIC =====

  /** Lấy danh sách khối có lớp học */
  @Get('classrooms/grades')
  getGrades() {
    return this.classroomService.findGrades();
  }

  /** Lấy danh sách lớp theo khối */
  @Get('classrooms')
  getByGrade(@Query('grade', ParseIntPipe) grade: number) {
    return this.classroomService.findByGrade(grade);
  }

  // ===== ADMIN =====

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/classrooms')
  findAll(@Query() query: PaginationDto & { grade?: number }) {
    if (query.grade) query.grade = Number(query.grade);
    return this.classroomService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/classrooms')
  create(@Body() dto: CreateClassroomDto) {
    return this.classroomService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/classrooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateClassroomDto) {
    return this.classroomService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/classrooms/:id')
  remove(@Param('id') id: string) {
    return this.classroomService.remove(id);
  }
}
