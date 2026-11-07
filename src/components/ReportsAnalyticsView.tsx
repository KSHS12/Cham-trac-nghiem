import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Layers,
  GraduationCap
} from 'lucide-react';
import { ClassGradebook, ExamScanResult } from '../types';
import { formatScore, getAcademicRank } from '../utils/gradingEngine';
import { exportGradebookToExcel } from '../utils/excelExporter';

interface ReportsAnalyticsViewProps {
  gradebooks: Record<string, ClassGradebook>;
  activeClass: string;
  examHistory: ExamScanResult[];
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  gradebooks,
  activeClass,
  examHistory,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(activeClass);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const currentBook = gradebooks[selectedClass] || {
    className: selectedClass,
    subjects: [],
    students: [],
    lastUpdated: new Date().toISOString(),
  };

  // Filter history
  const filteredHistory = examHistory.filter((h) => {
    if (h.className !== selectedClass) return false;
    if (selectedSubject !== 'ALL' && h.subject !== selectedSubject) return false;
    return true;
  });

  const scores = filteredHistory.map((h) => h.totalScore);
  const totalTests = scores.length;
  const maxScore = totalTests > 0 ? Math.max(...scores) : 0;
  const minScore = totalTests > 0 ? Math.min(...scores) : 0;
  const avgScore = totalTests > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / totalTests) * 100) / 100
    : 0;

  // Grade breakdown
  const xuatSac = scores.filter((s) => s >= 9.0).length;
  const gioi = scores.filter((s) => s >= 8.0 && s < 9.0).length;
  const kha = scores.filter((s) => s >= 6.5 && s < 8.0).length;
  const tb = scores.filter((s) => s >= 5.0 && s < 6.5).length;
  const yeu = scores.filter((s) => s < 5.0).length;

  // Histogram buckets: [0-2), [2-4), [4-5), [5-6), [6-7), [7-8), [8-9), [9-10]
  const buckets = [
    { label: '< 3.0', count: scores.filter((s) => s < 3.0).length },
    { label: '3.0 - 4.9', count: scores.filter((s) => s >= 3.0 && s < 5.0).length },
    { label: '5.0 - 6.4', count: scores.filter((s) => s >= 5.0 && s < 6.5).length },
    { label: '6.5 - 7.9', count: scores.filter((s) => s >= 6.5 && s < 8.0).length },
    { label: '8.0 - 8.9', count: scores.filter((s) => s >= 8.0 && s < 9.0).length },
    { label: '9.0 - 10', count: scores.filter((s) => s >= 9.0).length },
  ];

  const maxBucketCount = Math.max(...buckets.map((b) => b.count), 1);

  const handleExport = () => {
    exportGradebookToExcel(currentBook, examHistory, selectedSubject === 'ALL' ? undefined : selectedSubject);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Báo Cáo Phổ Điểm & Kết Quả Học Tập</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Thống kê phổ điểm, phân loại chất lượng học tập và xuất báo cáo hoàn chỉnh ra file Excel.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel Lớp {selectedClass}</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Chọn lớp báo cáo:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
          >
            {Object.keys(gradebooks).map((cls) => (
              <option key={cls} value={cls}>Lớp {cls}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Môn học:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
          >
            <option value="ALL">Tất cả các môn</option>
            {currentBook.subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Số bài đã chấm</span>
          <div className="text-2xl font-bold text-white mt-1">{totalTests}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Điểm trung bình</span>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {totalTests > 0 ? formatScore(avgScore) : '-'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Điểm cao nhất</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {totalTests > 0 ? formatScore(maxScore) : '-'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Điểm thấp nhất</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {totalTests > 0 ? formatScore(minScore) : '-'}
          </div>
        </div>
      </div>

      {/* Score Histogram Visual */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Biểu Đồ Phổ Điểm (Histogram)</span>
          </h3>
          <span className="text-xs text-slate-400">Thang điểm 10</span>
        </div>

        {totalTests === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Chưa có bài thi nào được chấm trong điều kiện lọc này.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {buckets.map((b) => {
              const pct = totalTests > 0 ? Math.round((b.count / totalTests) * 100) : 0;
              const barWidth = `${Math.round((b.count / maxBucketCount) * 100)}%`;

              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 w-20">{b.label}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{b.count} bài</span>
                      <span className="text-slate-500">({pct}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quality Level Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Phân Loại Chất Lượng Học Tập Theo Quy Chế</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-amber-500/30">
            <div className="text-xs text-amber-300 font-bold">Xuất sắc (≥9.0)</div>
            <div className="text-xl font-black text-white mt-1">{xuatSac}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalTests > 0 ? `${Math.round((xuatSac / totalTests) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30">
            <div className="text-xs text-emerald-300 font-bold">Giỏi (8.0-8.9)</div>
            <div className="text-xl font-black text-white mt-1">{gioi}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalTests > 0 ? `${Math.round((gioi / totalTests) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-blue-500/30">
            <div className="text-xs text-blue-300 font-bold">Khá (6.5-7.9)</div>
            <div className="text-xl font-black text-white mt-1">{kha}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalTests > 0 ? `${Math.round((kha / totalTests) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-orange-500/30">
            <div className="text-xs text-orange-300 font-bold">Trung bình (5.0-6.4)</div>
            <div className="text-xl font-black text-white mt-1">{tb}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalTests > 0 ? `${Math.round((tb / totalTests) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-rose-500/30 col-span-2 sm:col-span-1">
            <div className="text-xs text-rose-300 font-bold">Yếu (&lt;5.0)</div>
            <div className="text-xl font-black text-white mt-1">{yeu}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalTests > 0 ? `${Math.round((yeu / totalTests) * 100)}%` : '0%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
