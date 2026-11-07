import { AnswerKey, ClassGradebook, ExamScanResult, StudentGradeRecord } from '../types';
import { DEFAULT_ANSWER_KEYS } from './defaultAnswerKeys';
import { getAcademicRank } from './gradingEngine';

const STORAGE_KEYS = {
  GRADEBOOKS: 'omr_2025_gradebooks',
  HISTORY: 'omr_2025_history',
  ANSWER_KEYS: 'omr_2025_answer_keys',
  ACTIVE_SESSION: 'omr_2025_active_session',
};

export interface ActiveSession {
  className: string;
  subject: string;
  examCode: string;
}

// 1. Session state
export function loadActiveSession(): ActiveSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    className: '12A1',
    subject: 'Toán',
    examCode: '101',
  };
}

export function saveActiveSession(session: ActiveSession) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error(e);
  }
}

// 2. Answer Keys
export function loadAnswerKeys(): AnswerKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANSWER_KEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  // Initialize with default presets
  saveAnswerKeys(DEFAULT_ANSWER_KEYS);
  return DEFAULT_ANSWER_KEYS;
}

export function saveAnswerKeys(keys: AnswerKey[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ANSWER_KEYS, JSON.stringify(keys));
  } catch (e) {
    console.error(e);
  }
}

export function saveSingleAnswerKey(key: AnswerKey): AnswerKey[] {
  const current = loadAnswerKeys();
  const index = current.findIndex((k) => k.id === key.id);
  let updated: AnswerKey[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...key, updatedAt: new Date().toISOString() };
  } else {
    updated = [key, ...current];
  }
  saveAnswerKeys(updated);
  return updated;
}

// 3. History
export function loadExamHistory(): ExamScanResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveExamScan(scan: ExamScanResult): ExamScanResult[] {
  const current = loadExamHistory();
  // Filter out any duplicate scan with same id
  const updated = [scan, ...current.filter((item) => item.id !== scan.id)];
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage quota exceeded, removing older thumbnails', e);
    // Remove rawImage from older items to save space
    const pruned = updated.map((item, idx) => (idx > 5 ? { ...item, rawImage: undefined } : item));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(pruned));
  }
  return updated;
}

export function deleteExamScan(id: string): ExamScanResult[] {
  const current = loadExamHistory();
  const updated = current.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  return updated;
}

// 4. Gradebooks (Syncing classes, auto-adding columns for new subjects)
export function loadGradebooks(): Record<string, ClassGradebook> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GRADEBOOKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error(e);
  }

  // Prepopulate sample class so the teacher immediately sees a fully functional database
  const sample12A1: ClassGradebook = {
    className: '12A1',
    subjects: ['Toán', 'Vật lí'],
    lastUpdated: new Date().toISOString(),
    students: [
      {
        id: 's-01',
        sbd: '12001',
        name: 'Nguyễn Văn An',
        className: '12A1',
        scores: {
          Toán: { score: 9.0, examCode: '101', scannedAt: new Date().toISOString(), scanId: 'sample-1' },
          'Vật lí': { score: 8.5, examCode: '201', scannedAt: new Date().toISOString(), scanId: 'sample-2' },
        },
        gpa: 8.75,
        academicRank: 'Giỏi',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 's-02',
        sbd: '12002',
        name: 'Trần Thị Mai Linh',
        className: '12A1',
        scores: {
          Toán: { score: 9.5, examCode: '101', scannedAt: new Date().toISOString(), scanId: 'sample-3' },
          'Vật lí': { score: 9.25, examCode: '201', scannedAt: new Date().toISOString(), scanId: 'sample-4' },
        },
        gpa: 9.38,
        academicRank: 'Xuất sắc',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 's-03',
        sbd: '12003',
        name: 'Lê Hoàng Nam',
        className: '12A1',
        scores: {
          Toán: { score: 7.75, examCode: '102', scannedAt: new Date().toISOString(), scanId: 'sample-5' },
        },
        gpa: 7.75,
        academicRank: 'Khá',
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const initial = { '12A1': sample12A1 };
  saveGradebooks(initial);
  return initial;
}

export function saveGradebooks(gradebooks: Record<string, ClassGradebook>) {
  try {
    localStorage.setItem(STORAGE_KEYS.GRADEBOOKS, JSON.stringify(gradebooks));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Synchronize a scanned test paper into the Class Gradebook database.
 * If the subject is new for this class, automatically creates a new column for this subject.
 * If the student exists, updates their score. If not, adds them to the class roster.
 */
export function syncScanToGradebook(scan: ExamScanResult): {
  success: boolean;
  className: string;
  subject: string;
  isNewSubject: boolean;
  isNewStudent: boolean;
  studentName: string;
  sbd: string;
  score: number;
} {
  const gradebooks = loadGradebooks();
  const clsName = scan.className?.trim() || 'Chưa phân lớp';
  const subName = scan.subject?.trim() || 'Chung';

  let classBook = gradebooks[clsName];
  if (!classBook) {
    classBook = {
      className: clsName,
      subjects: [subName],
      students: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Check if subject is new for this class
  let isNewSubject = false;
  if (!classBook.subjects.includes(subName)) {
    classBook.subjects.push(subName);
    isNewSubject = true;
  }

  // Find student by SBD or Name
  let student = classBook.students.find(
    (s) => (s.sbd && s.sbd === scan.studentSBD) || (s.name.toLowerCase() === scan.studentName.toLowerCase())
  );

  let isNewStudent = false;
  if (!student) {
    isNewStudent = true;
    student = {
      id: 'stu-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sbd: scan.studentSBD || '0000',
      name: scan.studentName || 'Học sinh',
      className: clsName,
      scores: {},
      updatedAt: new Date().toISOString(),
    };
    classBook.students.push(student);
  }

  // Update subject score
  student.scores[subName] = {
    score: scan.totalScore,
    examCode: scan.examCode,
    scannedAt: scan.timestamp,
    scanId: scan.id,
  };
  student.updatedAt = new Date().toISOString();

  // Re-calculate GPA and rank for this student
  const validScores = classBook.subjects
    .map((sub) => student?.scores[sub]?.score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (validScores.length > 0) {
    student.gpa = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100;
    student.academicRank = getAcademicRank(student.gpa);
  }

  // Sort students alphabetically by name or SBD
  classBook.students.sort((a, b) => a.sbd.localeCompare(b.sbd, undefined, { numeric: true }));
  classBook.lastUpdated = new Date().toISOString();

  gradebooks[clsName] = classBook;
  saveGradebooks(gradebooks);

  return {
    success: true,
    className: clsName,
    subject: subName,
    isNewSubject,
    isNewStudent,
    studentName: scan.studentName,
    sbd: scan.studentSBD,
    score: scan.totalScore,
  };
}

export function updateStudentScoreManually(
  className: string,
  studentId: string,
  subject: string,
  newScore: number
) {
  const gradebooks = loadGradebooks();
  const book = gradebooks[className];
  if (!book) return false;

  const stu = book.students.find((s) => s.id === studentId);
  if (!stu) return false;

  stu.scores[subject] = {
    score: newScore,
    examCode: stu.scores[subject]?.examCode || '101',
    scannedAt: new Date().toISOString(),
    scanId: 'manual-edit',
  };

  const validScores = book.subjects
    .map((sub) => stu.scores[sub]?.score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (validScores.length > 0) {
    stu.gpa = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100;
    stu.academicRank = getAcademicRank(stu.gpa);
  }

  stu.updatedAt = new Date().toISOString();
  book.lastUpdated = new Date().toISOString();
  saveGradebooks(gradebooks);
  return true;
}

export function deleteStudentFromClass(className: string, studentId: string) {
  const gradebooks = loadGradebooks();
  const book = gradebooks[className];
  if (!book) return;
  book.students = book.students.filter((s) => s.id !== studentId);
  book.lastUpdated = new Date().toISOString();
  saveGradebooks(gradebooks);
}
