import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { SubjectModule } from './modules/subject/subject.module';
import { ExamModule } from './modules/exam/exam.module';
import { ExamSessionModule } from './modules/exam-session/exam-session.module';
import { ResultModule } from './modules/result/result.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ClassroomModule } from './modules/classroom/classroom.module';

@Module({
  imports: [
    // Cấu hình env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    PrismaModule,

    // Feature Modules
    AuthModule,
    AdminUserModule,
    SubjectModule,
    ExamModule,
    ExamSessionModule,
    ResultModule,
    DashboardModule,
    ClassroomModule,
  ],
})
export class AppModule {}
