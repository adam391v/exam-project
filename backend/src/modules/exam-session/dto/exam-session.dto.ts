import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class StartExamDto {
  @IsNotEmpty({ message: 'Mã đề thi không được để trống' })
  @IsString()
  examId: string;

  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  studentName: string;

  @IsOptional()
  @IsString()
  studentClass?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;
}

export class SaveAnswerDto {
  @IsNotEmpty({ message: 'Mã câu hỏi không được để trống' })
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @IsOptional()
  @IsString()
  textAnswer?: string;

  @IsOptional()
  @IsBoolean()
  isMarked?: boolean;

  @IsOptional()
  @IsBoolean()
  isViewed?: boolean;
}
