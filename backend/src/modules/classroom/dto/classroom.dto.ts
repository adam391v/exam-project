import { IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassroomDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  grade: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  grade?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}
