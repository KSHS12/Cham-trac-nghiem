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
  part1PerQuestion: number; // default 0.25 (for 40 questions = 10 pts, or adjusted)
  part2Rules: [number, number, number, number]; // [0.1, 0.25, 0.5, 1.0] standard BGD 2025
  part3PerQuestion: number; // default 0.5
  maxScale: number; // default 10.0
}

export interface AnswerKey {
  id: string;
  title: string;
  subject: string;
  examCode: string; // e.g. "101", "102"
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
  rawImage?: string; // data URL or thumbnail
  
  // Student detected answers
  part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  part2: Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>;
  part3: Record<number, string | null>;
  
  // Scores
  part1Score: number;
  part2Score: number;
  part3Score: number;
  totalScore: number;
  
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
}

export interface StudentScoreDetail {
  score: number;
  examCode: string;
  scannedAt: string;
  scanId: string;
}

export interface StudentGradeRecord {
  id: string;
  sbd: string;
  name: string;
  className: string;
  scores: Record<string, StudentScoreDetail>; // subjectName -> detail
  gpa?: number;
  academicRank?: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu';
  updatedAt: string;
}

export interface ClassGradebook {
  className: string;
  subjects: string[]; // dynamic list of subjects: ["Toán", "Vật lí", "Hóa học", ...]
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
    part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
    part2: Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>;
    part3: Record<number, string | null>;
    rawOcrNotes?: string;
    confidence: number;
  };
  error?: string;
}
