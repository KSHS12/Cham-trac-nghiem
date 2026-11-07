import { AnswerKey, ExamScanResult } from '../types';

export function normalizeNumericAnswer(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim().replace(',', '.');
  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    return num.toString();
  }
  return cleaned.toLowerCase();
}

export function evaluateExam(
  studentData: {
    studentName: string;
    studentSBD: string;
    className: string;
    subject: string;
    examCode: string;
    part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
    part2: Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>;
    part3: Record<number, string | null>;
    rawImage?: string;
    confidence?: number;
    notes?: string;
    detectedOnPaper?: {
      name?: string;
      sbd?: string;
      className?: string;
      subject?: string;
      examCode?: string;
    };
  },
  key?: AnswerKey | null
): ExamScanResult {
  const safeKey: AnswerKey = key || {
    id: 'placeholder-key',
    title: 'Chưa có đáp án',
    subject: studentData.subject,
    examCode: studentData.examCode,
    part1Count: 40,
    part2Count: 8,
    part3Count: 6,
    part1: {},
    part2: {},
    part3: {},
    scoringConfig: {
      part1PerQuestion: 0.25,
      part2Rules: [0.1, 0.25, 0.5, 1.0],
      part3PerQuestion: 0.5,
      maxScale: 10.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p1Count = safeKey.part1Count ?? 40;
  const p2Count = safeKey.part2Count ?? 8;
  const p3Count = safeKey.part3Count ?? 6;

  const scoring = safeKey.scoringConfig || {
    part1PerQuestion: 0.25,
    part2Rules: [0.1, 0.25, 0.5, 1.0],
    part3PerQuestion: 0.5,
    maxScale: 10.0,
  };

  // Tính tổng điểm tối đa khả dĩ theo cấu hình số câu của giáo viên
  const calculatedMax =
    Math.round(
      (p1Count * (scoring.part1PerQuestion || 0.25) +
        p2Count * ((scoring.part2Rules && scoring.part2Rules[3]) || 1.0) +
        p3Count * (scoring.part3PerQuestion || 0.5)) *
        100
    ) / 100;

  const maxScore = scoring.maxScale && scoring.maxScale > 0 ? scoring.maxScale : calculatedMax;

  // 1. Chấm Phần I (chỉ chấm trong phạm vi part1Count mà giáo viên cài đặt)
  let part1Score = 0;
  const part1Details: ExamScanResult['part1Details'] = {};

  for (let q = 1; q <= p1Count; q++) {
    const studentAns = studentData.part1[q] || null;
    const keyAns = safeKey.part1[q] || null;
    const isCorrect = !!(keyAns && studentAns && studentAns === keyAns);

    if (keyAns && isCorrect) {
      part1Score += scoring.part1PerQuestion;
    }

    part1Details[q] = {
      student: studentAns,
      key: keyAns,
      isCorrect,
    };
  }

  // 2. Chấm Phần II (chỉ chấm trong phạm vi part2Count)
  let part2Score = 0;
  const part2Details: ExamScanResult['part2Details'] = {};

  for (let q = 1; q <= p2Count; q++) {
    const studentQ = studentData.part2[q] || { a: null, b: null, c: null, d: null };
    const keyQ = safeKey.part2[q] || { a: false, b: false, c: false, d: false };

    const items = {
      a: {
        student: studentQ.a,
        key: keyQ.a,
        isCorrect: studentQ.a !== null && studentQ.a === keyQ.a,
      },
      b: {
        student: studentQ.b,
        key: keyQ.b,
        isCorrect: studentQ.b !== null && studentQ.b === keyQ.b,
      },
      c: {
        student: studentQ.c,
        key: keyQ.c,
        isCorrect: studentQ.c !== null && studentQ.c === keyQ.c,
      },
      d: {
        student: studentQ.d,
        key: keyQ.d,
        isCorrect: studentQ.d !== null && studentQ.d === keyQ.d,
      },
    };

    let correctCount = 0;
    if (items.a.isCorrect) correctCount++;
    if (items.b.isCorrect) correctCount++;
    if (items.c.isCorrect) correctCount++;
    if (items.d.isCorrect) correctCount++;

    let scoreGained = 0;
    const rules = scoring.part2Rules || [0.1, 0.25, 0.5, 1.0];
    if (correctCount === 1) scoreGained = rules[0];
    else if (correctCount === 2) scoreGained = rules[1];
    else if (correctCount === 3) scoreGained = rules[2];
    else if (correctCount === 4) scoreGained = rules[3];

    part2Score += scoreGained;

    part2Details[q] = {
      items,
      correctCount,
      scoreGained,
    };
  }

  // 3. Chấm Phần III (chỉ chấm trong phạm vi part3Count)
  let part3Score = 0;
  const part3Details: ExamScanResult['part3Details'] = {};

  for (let q = 1; q <= p3Count; q++) {
    const studentAns = studentData.part3[q] || null;
    const keyAns = safeKey.part3[q] || null;

    const normStudent = normalizeNumericAnswer(studentAns);
    const normKey = normalizeNumericAnswer(keyAns);

    const isCorrect = !!(normStudent && normKey && normStudent === normKey);

    if (keyAns && isCorrect) {
      part3Score += scoring.part3PerQuestion;
    }

    part3Details[q] = {
      student: studentAns,
      key: keyAns,
      isCorrect,
    };
  }

  // Tổng điểm toàn bài làm
  const totalScore = Math.round((part1Score + part2Score + part3Score) * 100) / 100;

  return {
    id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    className: studentData.className,
    subject: studentData.subject,
    examCode: studentData.examCode,
    studentName: studentData.studentName ? studentData.studentName.trim() : 'Học sinh chưa ghi tên',
    studentSBD: studentData.studentSBD ? studentData.studentSBD.trim() : '',
    rawImage: studentData.rawImage,
    confidence: studentData.confidence ?? 0.95,
    notes: studentData.notes,
    part1: studentData.part1,
    part2: studentData.part2,
    part3: studentData.part3,
    part1Score: Math.round(part1Score * 100) / 100,
    part2Score: Math.round(part2Score * 100) / 100,
    part3Score: Math.round(part3Score * 100) / 100,
    totalScore,
    maxScore,
    part1Details,
    part2Details,
    part3Details,
    detectedOnPaper: studentData.detectedOnPaper,
  };
}

export function getAcademicRank(score: number, maxScore: number = 10): 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.9) return 'Xuất sắc';
  if (ratio >= 0.8) return 'Giỏi';
  if (ratio >= 0.65) return 'Khá';
  if (ratio >= 0.5) return 'Trung bình';
  return 'Yếu';
}

export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return '-';
  return (Math.round(score * 100) / 100).toFixed(2).replace(/\.00$/, '');
}
