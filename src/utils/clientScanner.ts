import { ScanApiResponse } from '../types';

/**
 * Client-Side Emergency Fallback Scanner
 * Tuyệt đối KHÔNG tự tạo tên học sinh giả, không tạo SBD ngẫu nhiên.
 * Trả về các trường trống để giáo viên kiểm tra và tự xác nhận nếu máy chủ AI gặp sự cố.
 */
export function clientScanExam(
  expectedClass?: string,
  expectedSubject?: string,
  expectedExamCode?: string
): ScanApiResponse['data'] {
  const part1: Record<number, any> = {};
  for (let i = 1; i <= 40; i++) {
    part1[i] = null;
  }

  const part2: Record<number, any> = {};
  for (let i = 1; i <= 8; i++) {
    part2[i] = { a: null, b: null, c: null, d: null };
  }

  const part3: Record<number, any> = {};
  for (let i = 1; i <= 6; i++) {
    part3[i] = null;
  }

  return {
    studentName: '', // Để trống cho giáo viên kiểm tra, không bịa tên học sinh
    studentSBD: '', // Để trống nếu không đọc được, không bịa SBD
    className: expectedClass || '',
    subject: expectedSubject || '',
    examCode: expectedExamCode && expectedExamCode !== 'AUTO' ? expectedExamCode : '',
    part1,
    part2,
    part3,
    confidence: 0.5,
    rawOcrNotes: 'Không kết nối được dịch vụ nhận dạng AI. Vui lòng kiểm tra lại kết nối mạng.',
  };
}
