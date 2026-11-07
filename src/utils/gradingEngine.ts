import { AnswerKey, ExamScanResult } from '../types';

export function normalizeNumericAnswer(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim().replace(',', '.');
  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    // Return standard string representation
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
  },
  key: AnswerKey
): ExamScanResult {
  const scoring = key.scoringConfig || {
    part1PerQuestion: 0.25,
    part2Rules: [0.1, 0.25, 0.5, 1.0],
    part3PerQuestion: 0.5,
    maxScale: 10.0,
  };

  // 1. Evaluate Part 1 (1 - 40)
  let part1Score = 0;
  const part1Details: ExamScanResult['part1Details'] = {};

  for (let q = 1; q <= 40; q++) {
    const studentAns = studentData.part1[q] || null;
    const keyAns = key.part1[q] || null;
    const isCorrect = !!(keyAns && studentAns && studentAns === keyAns);

    if (keyAns) {
      if (isCorrect) {
        part1Score += scoring.part1PerQuestion;
      }
    }
    part1Details[q] = {
      student: studentAns,
      key: keyAns,
      isCorrect,
    };
  }

  // 2. Evaluate Part 2 (1 - 8)
  let part2Score = 0;
  const part2Details: ExamScanResult['part2Details'] = {};

  for (let q = 1; q <= 8; q++) {
    const studentQ = studentData.part2[q] || { a: null, b: null, c: null, d: null };
    const keyQ = key.part2[q] || { a: false, b: false, c: false, d: false };

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
    if (correctCount === 1) scoreGained = scoring.part2Rules[0];
    else if (correctCount === 2) scoreGained = scoring.part2Rules[1];
    else if (correctCount === 3) scoreGained = scoring.part2Rules[2];
    else if (correctCount === 4) scoreGained = scoring.part2Rules[3];

    part2Score += scoreGained;

    part2Details[q] = {
      items,
      correctCount,
      scoreGained,
    };
  }

  // 3. Evaluate Part 3 (1 - 6)
  let part3Score = 0;
  const part3Details: ExamScanResult['part3Details'] = {};

  for (let q = 1; q <= 6; q++) {
    const studentAns = studentData.part3[q] || null;
    const keyAns = key.part3[q] || null;

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

  // Total Score (round to 2 decimals)
  let totalScore = Math.round((part1Score + part2Score + part3Score) * 100) / 100;
  if (scoring.maxScale && totalScore > scoring.maxScale) {
    totalScore = scoring.maxScale;
  }

  return {
    id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    className: studentData.className,
    subject: studentData.subject,
    examCode: studentData.examCode,
    studentName: studentData.studentName || 'Thí sinh',
    studentSBD: studentData.studentSBD || '00000',
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
    part1Details,
    part2Details,
    part3Details,
  };
}

export function getAcademicRank(score: number): 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' {
  if (score >= 9.0) return 'Xuất sắc';
  if (score >= 8.0) return 'Giỏi';
  if (score >= 6.5) return 'Khá';
  if (score >= 5.0) return 'Trung bình';
  return 'Yếu';
}

export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return '-';
  return (Math.round(score * 100) / 100).toFixed(2).replace(/\.00$/, '');
}
