import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedQuestion {
  content: string;
  options: Array<{ label: string; content: string; isCorrect: boolean }>;
  explanation?: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
}

export interface ImportResult {
  questions: ParsedQuestion[];
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ImportService {
  /**
   * Parse file Excel thành mảng câu hỏi
   * Cấu trúc file: Câu hỏi | A | B | C | D | Đáp án đúng | Giải thích
   */
  parseExcel(buffer: Buffer): ImportResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('File Excel không có sheet nào');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new BadRequestException(
        'File Excel phải có ít nhất 1 hàng header và 1 hàng dữ liệu',
      );
    }

    const questions: ParsedQuestion[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Bỏ qua header (hàng 1), bắt đầu từ hàng 2
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row || row.length === 0 || !row[0]) continue;

      try {
        const question = this.parseRow(row, rowNum);
        questions.push(question);
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
        });
      }
    }

    return { questions, errors };
  }

  private parseRow(row: any[], rowNum: number): ParsedQuestion {
    const content = String(row[0] || '').trim();
    const optA = String(row[1] || '').trim();
    const optB = String(row[2] || '').trim();
    const optC = String(row[3] || '').trim();
    const optD = String(row[4] || '').trim();
    const correctAnswer = String(row[5] || '').trim().toUpperCase();
    const explanation = row[6] ? String(row[6]).trim() : undefined;

    if (!content) {
      throw new Error(`Hàng ${rowNum}: Nội dung câu hỏi không được để trống`);
    }

    if (!optA && !optB && !optC && !optD) {
      throw new Error(`Hàng ${rowNum}: Phải có ít nhất 1 đáp án`);
    }

    if (!correctAnswer) {
      throw new Error(`Hàng ${rowNum}: Đáp án đúng không được để trống`);
    }

    const correctLabels = correctAnswer
      .replace(/[,\s]+/g, '')
      .split('')
      .filter((c) => ['A', 'B', 'C', 'D'].includes(c));

    if (correctLabels.length === 0) {
      throw new Error(
        `Hàng ${rowNum}: Đáp án đúng phải là A, B, C, D (hoặc kết hợp)`,
      );
    }

    const type =
      correctLabels.length > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE';

    const allOptions = [
      { label: 'A', content: optA },
      { label: 'B', content: optB },
      { label: 'C', content: optC },
      { label: 'D', content: optD },
    ].filter((opt) => opt.content);

    const options = allOptions.map((opt) => ({
      ...opt,
      isCorrect: correctLabels.includes(opt.label),
    }));

    return { content, options, explanation, type };
  }
}
