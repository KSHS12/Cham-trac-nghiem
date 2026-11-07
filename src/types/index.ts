export interface QuestionPart1 {
  questionNumber: number;
  answer: 'A' | 'B' | 'C' | 'D' | null;
}

export interface QuestionPart2 {
  questionNumber: number;
  a: boolean | null;
  b: boolean | null;
  c: boolean | null;
  d: boolean | null;
}

export interface QuestionPart3 {
  questionNumber: number;
  answer: string | null;
}

export interface AnswerKeyScoringConfig {
  part1PerQuestion: number; // Điểm mỗi câu phần 1
  part2Rules: [number, number, number, number]; // [0.1, 0.25, 0.5, 1.0] điểm cho 1, 2, 3, 4 ý đúng
  part3PerQuestion: number; // Điểm mỗi câu phần 3
  maxScale: number; // Tổng điểm tối đa của đề thi (tính theo số câu hoặc tùy chỉnh)
}

export interface AnswerKey {
  id: string;
  title: string;
  subject: string;
  examCode: string; // ví dụ: "101", "102", "1101"
  part1Count: number; // Số câu hỏi Phần I (1 đến 40)
  part2Count: number; // Số câu hỏi Phần II (0 đến 8)
  part3Count: number; // Số câu hỏi Phần III (0 đến 6)
  part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>; // 1 - 40
  part2: Record<number, { a: boolean; b: boolean; c: boolean; d: boolean }>; // 1 - 8
  part3: Record<number, string>; // 1 - 6
  scoringConfig: AnswerKeyScoringConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ExamScanResult {
  id: string;
  timestamp: string;
  className: string;
  subject: string;
  examCode: string;
  studentName: string;
  studentSBD: string;
  rawImage?: string;

  // Student detected answers
  part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  part2: Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>;
  part3: Record<number, string | null>;

  // Scores
  part1Score: number;
  part2Score: number;
  part3Score: number;
  totalScore: number;
  maxScore: number; // Thang điểm tối đa của đề thi

  // Detailed comparison
  part1Details: Record<number, { student: string | null; key: string | null; isCorrect: boolean }>;
  part2Details: Record<number, {
    items: {
      a: { student: boolean | null; key: boolean; isCorrect: boolean };
      b: { student: boolean | null; key: boolean; isCorrect: boolean };
      c: { student: boolean | null; key: boolean; isCorrect: boolean };
      d: { student: boolean | null; key: boolean; isCorrect: boolean };
    };
    correctCount: number;
    scoreGained: number;
  }>;
  part3Details: Record<number, { student: string | null; key: string | null; isCorrect: boolean }>;

  confidence?: number;
  notes?: string;

  // Detected fields from image for verification against teacher settings
  detectedOnPaper?: {
    name?: string;
    sbd?: string;
    className?: string;
    subject?: string;
    examCode?: string;
  };
}

export interface StudentScoreDetail {
  score: number;
  maxScore?: number;
  examCode: string;
  scannedAt: string;
  scanId: string;
}

export interface StudentGradeRecord {
  id: string;
  sbd: string; // Số báo danh thật (có thể để trống "" nếu học sinh không ghi)
  name: string; // Họ và tên học sinh thật
  className: string;
  scores: Record<string, StudentScoreDetail>; // subjectName -> detail
  gpa?: number;
  academicRank?: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu';
  updatedAt: string;
}

export interface ClassGradebook {
  className: string;
  subjects: string[]; // Danh sách môn học của lớp
  students: StudentGradeRecord[];
  lastUpdated: string;
}

export interface ScanApiResponse {
  success: boolean;
  message?: string;
  data?: {
    studentName: string;
    studentSBD: string;
    examCode: string;
    className?: string;
    subject?: string;
    part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
    part2: Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>;
    part3: Record<number, string | null>;
    rawOcrNotes?: string;
    confidence: number;
    detectedOnPaper?: {
      name?: string;
      sbd?: string;
      className?: string;
      subject?: string;
      examCode?: string;
    };
  };
  error?: string;
}
