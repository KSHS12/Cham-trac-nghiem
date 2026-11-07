import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Layers,
  GraduationCap,
  Eye,
  Trash2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { ExamScanResult } from '../types';
import { formatScore, getAcademicRank } from '../utils/gradingEngine';

interface ExamHistoryViewProps {
  history: ExamScanResult[];
  onViewDetails: (scan: ExamScanResult) => void;
  onDeleteScan: (id: string) => void;
  onExportExcel: () => void;
}

export const ExamHistoryView: React.FC<ExamHistoryViewProps> = ({
  history,
  onViewDetails,
  onDeleteScan,
  onExportExcel,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Extract distinct classes and subjects from history
  const distinctClasses = Array.from(new Set(history.map((h) => h.className).filter(Boolean)));
  const distinctSubjects = Array.from(new Set(history.map((h) => h.subject).filter(Boolean)));

  const filtered = history.filter((item) => {
    if (selectedClass !== 'ALL' && item.className !== selectedClass) return false;
    if (selectedSubject !== 'ALL' && item.subject !== selectedSubject) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchSbd = item.studentSBD.toLowerCase().includes(q);
      const matchCode = item.examCode.toLowerCase().includes(q);
      if (!matchName && !matchSbd && !matchCode) return false;
    }
    return true;
  });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Lịch Sử Bài Chấm Cho Giáo Viên</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lưu giữ toàn bộ bài thi đã quét, điểm số chi tiết từng câu và hình ảnh bài làm của học sinh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất Danh Sách Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên, SBD hoặc Mã đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Lớp:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">Tất cả lớp ({distinctClasses.length})</option>
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Môn:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">Tất cả môn ({distinctSubjects.length})</option>
              {distinctSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-400">Chưa có bài thi nào trong lịch sử.</p>
          <p className="text-xs text-slate-600 mt-1">
            Các bài chấm sẽ tự động lưu lại ở đây ngay khi bạn chụp và quét bài thi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((scan) => {
            const rank = getAcademicRank(scan.totalScore);
            const rankColor = {
              'Xuất sắc': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              'Giỏi': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              'Khá': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              'Trung bình': 'bg-amber-600/20 text-amber-300 border-amber-600/30',
              'Yếu': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            }[rank];

            return (
              <div
                key={scan.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-lg flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Timestamp & Exam Code */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(scan.timestamp).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/20">
                          Lớp {scan.className}
                        </span>
                        <span className="font-semibold text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {scan.subject}
                        </span>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
                          Đề: {scan.examCode}
                        </span>
                      </div>
                    </div>

                    {/* Big Score Bubble */}
                    <div className="flex flex-col items-end">
                      <div className="text-2xl font-black text-white font-mono">
                        {formatScore(scan.totalScore)}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${rankColor}`}>
                        {rank}
                      </span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {scan.studentName}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        SBD: <strong className="text-slate-200">{scan.studentSBD}</strong>
                      </p>
                    </div>

                    {/* Section Breakdown Pills */}
                    <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
                      <div>P.I: <span className="text-blue-400 font-semibold">{formatScore(scan.part1Score)}đ</span></div>
                      <div>P.II: <span className="text-emerald-400 font-semibold">{formatScore(scan.part2Score)}đ</span></div>
                      <div>P.III: <span className="text-purple-400 font-semibold">{formatScore(scan.part3Score)}đ</span></div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewDetails(scan)}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Xem bài làm chi tiết</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa bản chấm bài thi của ${scan.studentName}?`)) {
                        onDeleteScan(scan.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Xóa bài thi này khỏi lịch sử"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
