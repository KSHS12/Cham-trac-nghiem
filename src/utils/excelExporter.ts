import * as XLSX from 'xlsx';
import { ClassGradebook, ExamScanResult } from '../types';
import { formatScore, getAcademicRank } from './gradingEngine';

export function exportGradebookToExcel(
  gradebook: ClassGradebook,
  history: ExamScanResult[],
  selectedSubject?: string
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Bảng Điểm Tổng Hợp Lớp
  const summaryHeaders = ['STT', 'Số báo danh', 'Họ và tên', 'Lớp', ...gradebook.subjects, 'Điểm TB', 'Xếp loại'];
  const summaryRows = gradebook.students.map((student, idx) => {
    const subjectScores = gradebook.subjects.map((sub) => {
      const scoreObj = student.scores[sub];
      return scoreObj !== undefined ? scoreObj.score : '';
    });

    // Calculate GPA across available subjects
    const validScores = gradebook.subjects
      .map((sub) => student.scores[sub]?.score)
      .filter((s): s is number => s !== undefined && s !== null);

    const gpa = validScores.length > 0
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
      : '';
    const rank = typeof gpa === 'number' ? getAcademicRank(gpa) : '';

    return [
      idx + 1,
      student.sbd,
      student.name,
      student.className,
      ...subjectScores,
      gpa !== '' ? gpa : '-',
      rank || '-',
    ];
  });

  const wsSummary = XLSX.utils.aoa_to_sheet([
    [`BẢNG ĐIỂM TỔNG HỢP HỌC SINH - LỚP ${gradebook.className}`],
    [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
    [],
    summaryHeaders,
    ...summaryRows,
  ]);

  // Adjust column widths
  wsSummary['!cols'] = [
    { wch: 6 }, // STT
    { wch: 14 }, // SBD
    { wch: 25 }, // Ho ten
    { wch: 10 }, // Lop
    ...gradebook.subjects.map(() => ({ wch: 12 })),
    { wch: 10 }, // Diem TB
    { wch: 14 }, // Xep loai
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, `Bảng điểm Lớp ${gradebook.className}`.substring(0, 31));

  // 2. Sheet: Chi Tiết Lịch Sử Bài Chấm
  const filteredHistory = selectedSubject
    ? history.filter((h) => h.className === gradebook.className && h.subject === selectedSubject)
    : history.filter((h) => h.className === gradebook.className);

  const historyHeaders = [
    'STT',
    'Thời gian chấm',
    'Số báo danh',
    'Họ và tên',
    'Lớp',
    'Môn thi',
    'Mã đề',
    'Điểm Phần I',
    'Điểm Phần II',
    'Điểm Phần III',
    'Tổng điểm /10',
    'Xếp loại',
  ];

  const historyRows = filteredHistory.map((scan, idx) => [
    idx + 1,
    new Date(scan.timestamp).toLocaleString('vi-VN'),
    scan.studentSBD,
    scan.studentName,
    scan.className,
    scan.subject,
    scan.examCode,
    scan.part1Score,
    scan.part2Score,
    scan.part3Score,
    scan.totalScore,
    getAcademicRank(scan.totalScore),
  ]);

  const wsHistory = XLSX.utils.aoa_to_sheet([
    [`CHI TIẾT KẾT QUẢ BÀI CHẤM THI TRẮC NGHIỆM - LỚP ${gradebook.className}`],
    [`Tổng số bài thi: ${filteredHistory.length}`],
    [],
    historyHeaders,
    ...historyRows,
  ]);

  wsHistory['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 14 },
    { wch: 25 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, wsHistory, 'Chi tiết bài thi');

  // 3. Sheet: Thống kê & Phổ điểm
  const statsRows = gradebook.subjects.map((sub) => {
    const scores = filteredHistory
      .filter((h) => h.subject === sub)
      .map((h) => h.totalScore);

    if (scores.length === 0) {
      return [sub, 0, '-', '-', '-', 0, 0, 0, 0, 0];
    }

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    const xuatSac = scores.filter((s) => s >= 9.0).length;
    const gioi = scores.filter((s) => s >= 8.0 && s < 9.0).length;
    const kha = scores.filter((s) => s >= 6.5 && s < 8.0).length;
    const tb = scores.filter((s) => s >= 5.0 && s < 6.5).length;
    const yeu = scores.filter((s) => s < 5.0).length;

    return [sub, scores.length, max, min, avg, xuatSac, gioi, kha, tb, yeu];
  });

  const wsStats = XLSX.utils.aoa_to_sheet([
    [`BÁO CÁO PHỔ ĐIỂM VÀ THỐNG KÊ KẾT QUẢ HỌC TẬP`],
    [`Lớp: ${gradebook.className}`],
    [],
    [
      'Môn học',
      'Số bài thi',
      'Điểm cao nhất',
      'Điểm thấp nhất',
      'Điểm TB môn',
      'Xuất sắc (>=9.0)',
      'Giỏi (8.0-8.9)',
      'Khá (6.5-7.9)',
      'Trung bình (5.0-6.4)',
      'Yếu (<5.0)',
    ],
    ...statsRows,
  ]);

  wsStats['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, wsStats, 'Thống kê phổ điểm');

  // Generate file download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Bang_Diem_Lop_${gradebook.className.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
