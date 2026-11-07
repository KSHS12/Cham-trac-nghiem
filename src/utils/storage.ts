import { AnswerKey, ClassGradebook, ExamScanResult, StudentGradeRecord } from '../types';
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
  examCode: string; // "AUTO" hoặc mã đề cụ thể
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
    examCode: 'AUTO', // Mặc định tự động dò mã đề
  };
}

export function saveActiveSession(session: ActiveSession) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error(e);
  }
}

// 2. Answer Keys (Không có mẫu mặc định, giáo viên tự tạo và tự nhập)
export function loadAnswerKeys(): AnswerKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANSWER_KEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
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

export function deleteAnswerKeyById(id: string): AnswerKey[] {
  const current = loadAnswerKeys();
  const updated = current.filter((k) => k.id !== id);
  saveAnswerKeys(updated);
  return updated;
}

// 3. History (Lịch sử bài chấm thật của giáo viên, không có bài kiểm thử mẫu)
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
  const updated = [scan, ...current.filter((item) => item.id !== scan.id)];
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Storage quota exceeded, removing older thumbnails', e);
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

// 4. Gradebooks (Bắt đầu sạch sẽ, không có danh sách học sinh giả định)
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
  // Trả về rỗng ban đầu, học sinh được thêm tự động khi chấm bài thật
  return {};
}

export function saveGradebooks(gradebooks: Record<string, ClassGradebook>) {
  try {
    localStorage.setItem(STORAGE_KEYS.GRADEBOOKS, JSON.stringify(gradebooks));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Tự động thêm học sinh vào bảng điểm khi chấm bài mới:
 * - Nếu học sinh có SBD: kiểm tra SBD trong lớp để không bị trùng (cập nhật nếu cùng SBD).
 * - Nếu học sinh không ghi SBD: để trống SBD (""), đối soát theo Họ và tên.
 * - Tự động tạo thêm cột môn mới nếu lớp chưa có môn đó.
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

  // Tự động thêm cột môn mới nếu chưa có
  let isNewSubject = false;
  if (!classBook.subjects.includes(subName)) {
    classBook.subjects.push(subName);
    isNewSubject = true;
  }

  // Tìm học sinh:
  // 1. Nếu có SBD: tìm chính xác theo SBD trong lớp (không trùng lặp SBD)
  // 2. Nếu không có SBD: tìm theo tên học sinh
  let student: StudentGradeRecord | undefined;
  const sbdClean = (scan.studentSBD || '').trim();
  const nameClean = (scan.studentName || '').trim();

  if (sbdClean) {
    student = classBook.students.find((s) => s.sbd && s.sbd.trim() === sbdClean);
  } else if (nameClean) {
    student = classBook.students.find((s) => s.name.trim().toLowerCase() === nameClean.toLowerCase());
  }

  let isNewStudent = false;
  if (!student) {
    isNewStudent = true;
    student = {
      id: 'stu-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sbd: sbdClean, // Để trống nếu học sinh không ghi, tuyệt đối không tự bịa SBD
      name: nameClean || 'Học sinh chưa ghi tên',
      className: clsName,
      scores: {},
      updatedAt: new Date().toISOString(),
    };
    classBook.students.push(student);
  } else {
    // Nếu học sinh đã có mà bài này có tên rõ ràng hơn thì cập nhật
    if (nameClean && (!student.name || student.name === 'Học sinh chưa ghi tên')) {
      student.name = nameClean;
    }
    if (sbdClean && !student.sbd) {
      student.sbd = sbdClean;
    }
  }

  // Cập nhật điểm cho môn học này
  student.scores[subName] = {
    score: scan.totalScore,
    maxScore: scan.maxScore,
    examCode: scan.examCode,
    scannedAt: scan.timestamp,
    scanId: scan.id,
  };
  student.updatedAt = new Date().toISOString();

  // Tính lại điểm trung bình (GPA)
  const validScores = classBook.subjects
    .map((sub) => student?.scores[sub]?.score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (validScores.length > 0) {
    student.gpa = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100;
    student.academicRank = getAcademicRank(student.gpa);
  }

  // Sắp xếp học sinh theo SBD hoặc Tên
  classBook.students.sort((a, b) => {
    if (a.sbd && b.sbd) {
      return a.sbd.localeCompare(b.sbd, undefined, { numeric: true });
    }
    return a.name.localeCompare(b.name, 'vi');
  });

  classBook.lastUpdated = new Date().toISOString();
  gradebooks[clsName] = classBook;
  saveGradebooks(gradebooks);

  return {
    success: true,
    className: clsName,
    subject: subName,
    isNewSubject,
    isNewStudent,
    studentName: student.name,
    sbd: student.sbd,
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
    maxScore: stu.scores[subject]?.maxScore || 10,
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
