import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedQuestion {
  content: string;
  options: Array<{ label: string; content: string; isCorrect: boolean }>;
  explanation?: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK';
}

export interface ParsedGroup {
  title?: string;
  content: string;
  questions: ParsedQuestion[];
}

export interface ImportResult {
  questions: ParsedQuestion[];
  groups: ParsedGroup[];
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ImportService {
  /**
   * Parse file Excel thành mảng câu hỏi + câu chùm
   *
   * Format câu đơn (cũ):
   * | Câu hỏi | A | B | C | D | Đáp án đúng | Giải thích |
   *
   * Format mới (hỗ trợ câu chùm):
   * | Loại | Nội dung chung | Câu hỏi | A | B | C | D | Đáp án đúng | Giải thích |
   *
   * - Cột "Loại" = "CHÙM" → bắt đầu group mới, "Nội dung chung" là nội dung chung
   * - Hàng tiếp theo (Loại trống) → câu hỏi con trong group
   * - Nếu file chỉ có 7 cột → legacy format (câu đơn only)
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

    // Detect format: nếu header có "Loại" hoặc >= 9 cột → format mới
    const header = rows[0] as string[];
    const isNewFormat = header.length >= 9 ||
      header.some((h: string) => typeof h === 'string' && h.toLowerCase().includes('loại'));

    if (isNewFormat) {
      return this.parseNewFormat(rows);
    } else {
      return this.parseLegacyFormat(rows);
    }
  }

  /** Format cũ: Câu hỏi | A | B | C | D | Đáp án | Giải thích */
  private parseLegacyFormat(rows: any[]): ImportResult {
    const questions: ParsedQuestion[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      if (!row || row.length === 0 || !row[0]) continue;

      try {
        const question = this.parseQuestionRow(row, rowNum, 0);
        questions.push(question);
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
        });
      }
    }

    return { questions, groups: [], errors };
  }

  /** Format mới: Loại | Nội dung chung | Câu hỏi | A | B | C | D | Đáp án | Giải thích */
  private parseNewFormat(rows: any[]): ImportResult {
    const questions: ParsedQuestion[] = [];
    const groups: ParsedGroup[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    let currentGroup: ParsedGroup | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      if (!row || row.length === 0) continue;

      const loai = String(row[0] || '').trim().toUpperCase();
      const noiDungChung = String(row[1] || '').trim();

      if (loai === 'CHÙM' || loai === 'CHUM' || loai === 'GROUP') {
        // Bắt đầu group mới
        if (currentGroup && currentGroup.questions.length > 0) {
          groups.push(currentGroup);
        }
        if (!noiDungChung) {
          errors.push({ row: rowNum, message: 'Nội dung chung không được để trống' });
          currentGroup = null;
          continue;
        }
        currentGroup = {
          title: noiDungChung.substring(0, 100),
          content: noiDungChung,
          questions: [],
        };
        continue;
      }

      // Câu điền đáp án
      if (loai === 'ĐIỀN' || loai === 'DIEN' || loai === 'FILL') {
        if (currentGroup && currentGroup.questions.length > 0) {
          groups.push(currentGroup);
          currentGroup = null;
        }
        try {
          const question = this.parseFillInBlankRow(row, rowNum);
          questions.push(question);
        } catch (error) {
          errors.push({
            row: rowNum,
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
          });
        }
        continue;
      }

      // Nếu đang trong group context → câu hỏi con
      if (currentGroup) {
        const cauHoi = String(row[2] || '').trim();
        if (!cauHoi) {
          // Kết thúc group nếu hàng trống
          if (currentGroup.questions.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = null;
          continue;
        }

        try {
          const question = this.parseQuestionRow(row, rowNum, 2);
          currentGroup.questions.push(question);
        } catch (error) {
          errors.push({
            row: rowNum,
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
          });
        }
        continue;
      }

      // Câu đơn (Loại trống, không có group context)
      // Kiểm tra: nếu cột 2 (Câu hỏi) có giá trị → dùng cột 2
      // Nếu không → thử cột 0 (backward compat)
      const cauHoiCol2 = String(row[2] || '').trim();
      if (cauHoiCol2) {
        try {
          const question = this.parseQuestionRow(row, rowNum, 2);
          questions.push(question);
        } catch (error) {
          errors.push({
            row: rowNum,
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
          });
        }
      } else {
        // Cột 0 có thể là câu hỏi đơn (legacy row trong file mới)
        const cauHoiCol0 = String(row[0] || '').trim();
        if (cauHoiCol0) {
          try {
            const question = this.parseQuestionRow(row, rowNum, 0);
            questions.push(question);
          } catch (error) {
            errors.push({
              row: rowNum,
              message: error instanceof Error ? error.message : 'Lỗi không xác định',
            });
          }
        }
      }
    }

    // Push group cuối nếu còn
    if (currentGroup && currentGroup.questions.length > 0) {
      groups.push(currentGroup);
    }

    return { questions, groups, errors };
  }

  /**
   * Parse 1 hàng câu hỏi bắt đầu từ cột offset
   * offset=0: | Câu hỏi | A | B | C | D | Đáp án | Giải thích |
   * offset=2: | ... | ... | Câu hỏi | A | B | C | D | Đáp án | Giải thích |
   */
  private parseQuestionRow(row: any[], rowNum: number, offset: number): ParsedQuestion {
    const content = String(row[offset] || '').trim();
    const optA = String(row[offset + 1] || '').trim();
    const optB = String(row[offset + 2] || '').trim();
    const optC = String(row[offset + 3] || '').trim();
    const optD = String(row[offset + 4] || '').trim();
    const correctAnswer = String(row[offset + 5] || '').trim().toUpperCase();
    const explanation = row[offset + 6] ? String(row[offset + 6]).trim() : undefined;

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

    const type = correctLabels.length > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE';

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

  /**
   * Parse 1 hàng câu hỏi điền đáp án (FILL_IN_BLANK)
   * Format: | ĐIỀN | (trống) | Câu hỏi | (trống) | (trống) | (trống) | (trống) | Đáp án đúng | Giải thích |
   * Đáp án đúng phân cách bằng ';' (hỗ trợ nhiều đáp án)
   */
  private parseFillInBlankRow(row: any[], rowNum: number): ParsedQuestion {
    const content = String(row[2] || '').trim();
    const correctAnswerRaw = String(row[7] || '').trim();
    const explanation = row[8] ? String(row[8]).trim() : undefined;

    if (!content) {
      throw new Error(`Hàng ${rowNum}: Nội dung câu hỏi không được để trống`);
    }

    if (!correctAnswerRaw) {
      throw new Error(`Hàng ${rowNum}: Đáp án đúng không được để trống cho câu điền đáp án`);
    }

    // Phân tách nhiều đáp án bằng ';'
    const answers = correctAnswerRaw
      .split(';')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const options = answers.map((ans, idx) => ({
      label: `ANS${idx + 1}`,
      content: ans,
      isCorrect: true,
    }));

    return { content, options, explanation, type: 'FILL_IN_BLANK' };
  }
}
