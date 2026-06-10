import { PrismaClient, Role, ExamStatus, QuestionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://system_users:123456@localhost:5432/exam_project?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // 1. Tạo admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Quản trị viên',
      email: 'admin@examonline.vn',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`✅ Admin user: ${admin.username}`);

  // 2. Tạo môn học
  const subjects = [
    { name: 'Toán học', code: 'MATH', description: 'Môn Toán học cơ bản và nâng cao', sortOrder: 1 },
    { name: 'Vật Lý', code: 'PHYSICS', description: 'Vật lý đại cương và ứng dụng', sortOrder: 2 },
    { name: 'Hóa Học', code: 'CHEMISTRY', description: 'Hóa học vô cơ và hữu cơ', sortOrder: 3 },
    { name: 'Tiếng Anh', code: 'ENGLISH', description: 'Tiếng Anh giao tiếp và ngữ pháp', sortOrder: 4 },
    { name: 'Sinh Học', code: 'BIOLOGY', description: 'Sinh học tế bào và di truyền', sortOrder: 5 },
  ];

  const createdSubjects: any[] = [];
  for (const s of subjects) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    createdSubjects.push(subject);
    console.log(`✅ Môn học: ${subject.name}`);
  }

  // 3. Tạo đề thi Toán (kèm câu hỏi trực tiếp)
  const mathExam = await prisma.exam.create({
    data: {
      title: 'Kiểm tra Toán học - Chương 1',
      subjectId: createdSubjects[0].id,
      duration: 30,
      totalQuestions: 10,
      status: ExamStatus.PUBLISHED,
      isPublic: true,
      showAnswer: true,
      description: 'Kiểm tra kiến thức chương 1: Phương trình và hệ phương trình',
      questions: {
        create: [
          {
            content: 'Giải phương trình: 2x + 3 = 7',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 0,
            options: {
              create: [
                { label: 'A', content: 'x = 1', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'x = 2', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'x = 3', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'x = 4', isCorrect: false, sortOrder: 3 },
              ],
            },
            explanation: '2x + 3 = 7 → 2x = 4 → x = 2',
          },
          {
            content: 'Nghiệm của phương trình x² - 5x + 6 = 0 là?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 1,
            options: {
              create: [
                { label: 'A', content: 'x = 1 hoặc x = 6', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'x = 2 hoặc x = 3', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'x = -2 hoặc x = -3', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'Vô nghiệm', isCorrect: false, sortOrder: 3 },
              ],
            },
            explanation: 'x² - 5x + 6 = (x-2)(x-3) = 0 → x = 2 hoặc x = 3',
          },
          {
            content: 'Giá trị của biểu thức √16 + √9 bằng bao nhiêu?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 2,
            options: {
              create: [
                { label: 'A', content: '5', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '7', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: '25', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '12', isCorrect: false, sortOrder: 3 },
              ],
            },
            explanation: '√16 = 4, √9 = 3, tổng = 7',
          },
          {
            content: 'Phương trình 3x - 9 = 0 có nghiệm x bằng?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 3,
            options: {
              create: [
                { label: 'A', content: '3', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: '-3', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: '9', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '0', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Hệ phương trình: x + y = 5, x - y = 1. Giá trị của x là?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 4,
            options: {
              create: [
                { label: 'A', content: '2', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '3', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: '4', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '5', isCorrect: false, sortOrder: 3 },
              ],
            },
            explanation: 'Cộng 2 PT: 2x = 6 → x = 3',
          },
          {
            content: 'Giá trị nào sau đây là nghiệm của |x| = 5?',
            type: QuestionType.MULTIPLE_CHOICE,
            sortOrder: 5,
            options: {
              create: [
                { label: 'A', content: 'x = 5', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: 'x = -5', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'x = 0', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'x = 25', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Biểu thức (a + b)² bằng?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 6,
            options: {
              create: [
                { label: 'A', content: 'a² + b²', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'a² + 2ab + b²', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'a² - 2ab + b²', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '2a² + 2b²', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Nếu f(x) = 2x + 1, thì f(3) = ?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 7,
            options: {
              create: [
                { label: 'A', content: '5', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '6', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: '7', isCorrect: true, sortOrder: 2 },
                { label: 'D', content: '8', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Số nào sau đây là số nguyên tố?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 8,
            options: {
              create: [
                { label: 'A', content: '9', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '15', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: '17', isCorrect: true, sortOrder: 2 },
                { label: 'D', content: '21', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'log₂(8) bằng bao nhiêu?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 9,
            options: {
              create: [
                { label: 'A', content: '2', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '3', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: '4', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '8', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Đề thi Toán: ${mathExam.title}`);

  // 4. Tạo đề thi Vật Lý (kèm câu hỏi)
  const physicsExam = await prisma.exam.create({
    data: {
      title: 'Kiểm tra Vật Lý - Cơ học và Điện từ',
      subjectId: createdSubjects[1].id,
      duration: 45,
      totalQuestions: 10,
      status: ExamStatus.PUBLISHED,
      isPublic: true,
      showAnswer: true,
      description: 'Bài kiểm tra tổng hợp về cơ học và điện từ',
      questions: {
        create: [
          {
            content: 'Đơn vị đo lực trong hệ SI là gì?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 0,
            options: {
              create: [
                { label: 'A', content: 'Newton (N)', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: 'Joule (J)', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: 'Pascal (Pa)', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'Watt (W)', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Công thức tính vận tốc đều là?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 1,
            options: {
              create: [
                { label: 'A', content: 'v = s × t', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'v = s / t', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'v = s + t', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'v = s - t', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Gia tốc trọng trường g xấp xỉ bằng?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 2,
            options: {
              create: [
                { label: 'A', content: '9.8 m/s²', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: '10.2 m/s²', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: '8.5 m/s²', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '11 m/s²', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Định luật II Newton được phát biểu: F = ?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 3,
            options: {
              create: [
                { label: 'A', content: 'm × v', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'm × a', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'm × g', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'm × s', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Điện trở R có đơn vị đo là?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 4,
            options: {
              create: [
                { label: 'A', content: 'Volt (V)', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'Ampe (A)', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: 'Ohm (Ω)', isCorrect: true, sortOrder: 2 },
                { label: 'D', content: 'Watt (W)', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Công thức định luật Ohm là?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 5,
            options: {
              create: [
                { label: 'A', content: 'U = I × R', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: 'U = I / R', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: 'U = I + R', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'U = R / I', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Trong mạch nối tiếp, đại lượng nào không đổi?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 6,
            options: {
              create: [
                { label: 'A', content: 'Hiệu điện thế', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: 'Cường độ dòng điện', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: 'Điện trở', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'Công suất', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Năng lượng nhiệt được tính bằng công thức Q = ?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 7,
            options: {
              create: [
                { label: 'A', content: 'm × c × Δt', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: 'm × g × h', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: '½ × m × v²', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'F × s', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Ánh sáng truyền trong chân không với vận tốc xấp xỉ?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 8,
            options: {
              create: [
                { label: 'A', content: '3 × 10⁶ m/s', isCorrect: false, sortOrder: 0 },
                { label: 'B', content: '3 × 10⁸ m/s', isCorrect: true, sortOrder: 1 },
                { label: 'C', content: '3 × 10⁵ m/s', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: '3 × 10¹⁰ m/s', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
          {
            content: 'Công suất điện được tính bằng P = ?',
            type: QuestionType.SINGLE_CHOICE,
            sortOrder: 9,
            options: {
              create: [
                { label: 'A', content: 'U × I', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: 'U / I', isCorrect: false, sortOrder: 1 },
                { label: 'C', content: 'U + I', isCorrect: false, sortOrder: 2 },
                { label: 'D', content: 'I / U', isCorrect: false, sortOrder: 3 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Đề thi Vật Lý: ${physicsExam.title}`);

  // 5. System configs
  await prisma.systemConfig.upsert({
    where: { key: 'APP_NAME' },
    update: {},
    create: { key: 'APP_NAME', value: 'ExamOnline', description: 'Tên ứng dụng' },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'MAX_EXAM_DURATION' },
    update: {},
    create: { key: 'MAX_EXAM_DURATION', value: '180', description: 'Thời gian thi tối đa (phút)' },
  });
  console.log('✅ System configs');

  console.log('\n🎉 Seed dữ liệu hoàn tất!');
  console.log('📝 Admin đăng nhập: username=admin, password=Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
