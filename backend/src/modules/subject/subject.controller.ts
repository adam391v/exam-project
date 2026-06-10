import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubjectService } from './subject.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('api')
export class SubjectController {
  constructor(private subjectService: SubjectService) {}

  // ===== PUBLIC =====

  @Get('subjects')
  findAllPublic() {
    return this.subjectService.findAllPublic();
  }

  // ===== ADMIN =====

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/subjects')
  findAll(@Query() query: PaginationDto) {
    return this.subjectService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/subjects/:id')
  findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/subjects')
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/subjects/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('admin/subjects/:id')
  remove(@Param('id') id: string) {
    return this.subjectService.remove(id);
  }
}
