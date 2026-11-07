import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  User,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { ClassGradebook, ExamScanResult } from '../types';
import { formatScore, getAcademicRank } from '../utils/gradingEngine';
import { exportGradebookToExcel } from '../utils/excelExporter';

interface GradebookViewProps {
  gradebooks: Record<string, ClassGradebook>;
  activeClass: string;
  setActiveClass: (cls: string) => void;
  examHistory: ExamScanResult[];
  onUpdateScore: (className: string, studentId: string, subject: string, score: number) => void;
  onDeleteStudent: (className: string, studentId: string) => void;
  onAddStudent: (className: string, sbd: string, name: string) => void;
  onAddSubject: (className: string, subjectName: string) => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  gradebooks,
  activeClass,
  setActiveClass,
  examHistory,
  onUpdateScore,
  onDeleteStudent,
  onAddStudent,
  onAddSubject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ studentId: string; subject: string; value: string } | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newSbd, setNewSbd] = useState('');
  const [newName, setNewName] = useState('');
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [showAddSubjectInput, setShowAddSubjectInput] = useState(false);

  const currentBook = gradebooks[activeClass] || {
    className: activeClass,
    subjects: ['Toán'],
    students: [],
    lastUpdated: new Date().toISOString(),
  };

  // Filter students
  const filteredStudents = currentBook.students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.sbd.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  // Calculate Class stats
  const allGpas = currentBook.students.map((s) => s.gpa).filter((g): g is number => g !== undefined);
  const classAvg = allGpas.length > 0
    ? Math.round((allGpas.reduce((a, b) => a + b, 0) / allGpas.length) * 100) / 100
    : 0;

  const handleExport = () => {
    exportGradebookToExcel(currentBook, examHistory);
  };

  const handleSaveScoreEdit = () => {
    if (!editingCell) return;
    const num = parseFloat(editingCell.value);
    if (!isNaN(num) && num >= 0 && num <= 10) {
      onUpdateScore(activeClass, editingCell.studentId, editingCell.subject, Math.round(num * 100) / 100);
    }
    setEditingCell(null);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSbd.trim() && newName.trim()) {
      onAddStudent(activeClass, newSbd.trim(), newName.trim());
      setNewSbd('');
      setNewName('');
      setShowAddStudentModal(false);
    }
  };

  const handleCreateSubject = () => {
    if (newSubjectInput.trim()) {
      onAddSubject(activeClass, newSubjectInput.trim());
      setNewSubjectInput('');
      setShowAddSubjectInput(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner & Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Bảng Điểm Tổng Hợp Lớp {currentBook.className}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Đồng bộ đa môn
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mỗi bài chấm mới sẽ tự động cập nhật hoặc thêm cột môn mới cho danh sách học sinh.
          </p>
        </div>

        {/* Action button to export Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Thêm học sinh</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium shrink-0">Chọn lớp:</span>
        {Object.keys(gradebooks).map((cls) => (
          <button
            key={cls}
            onClick={() => setActiveClass(cls)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              activeClass === cls
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Lớp {cls} ({gradebooks[cls]?.students?.length || 0} HS)
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-xs text-slate-400">Tổng số học sinh</div>
          <div className="text-2xl font-bold text-white mt-1">
            {currentBook.students.length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-xs text-slate-400">Số môn đã chấm</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {currentBook.subjects.length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-xs text-slate-400">Điểm TB Lớp</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {classAvg > 0 ? formatScore(classAvg) : '-'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-xs text-slate-400">Tỉ lệ Giỏi / Xuất sắc</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {allGpas.length > 0
              ? `${Math.round((allGpas.filter((g) => g >= 8.0).length / allGpas.length) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Search and Column Management */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo SBD hoặc Tên học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {!showAddSubjectInput ? (
            <button
              onClick={() => setShowAddSubjectInput(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm cột môn</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Tên môn mới..."
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                className="w-32 px-2.5 py-1.5 bg-slate-950 border border-emerald-500 rounded-lg text-white text-xs focus:outline-none"
              />
              <button
                onClick={handleCreateSubject}
                className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowAddSubjectInput(false)}
                className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Gradebook Spreadsheet Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-3 w-28">Số báo danh</th>
                <th className="py-3 px-4 min-w-[160px]">Họ và tên</th>
                <th className="py-3 px-3 w-20">Lớp</th>

                {/* Dynamic Subject Columns */}
                {currentBook.subjects.map((sub) => (
                  <th key={sub} className="py-3 px-3 text-center min-w-[100px] bg-slate-950/80">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-bold">{sub}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Thang 10</span>
                    </div>
                  </th>
                ))}

                <th className="py-3 px-3 text-center w-24 bg-blue-950/30 text-blue-300 font-bold">
                  Điểm TB
                </th>
                <th className="py-3 px-3 text-center w-28">Xếp loại</th>
                <th className="py-3 px-3 text-center w-16">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + currentBook.subjects.length}
                    className="py-12 text-center text-slate-500"
                  >
                    Chưa có học sinh nào trong lớp này. Hãy chụp bài thi để tự động thêm học sinh hoặc nhấn "Thêm học sinh".
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, idx) => {
                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-white">
                        {stu.sbd}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {stu.name}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {stu.className}
                      </td>

                      {/* Subject Scores with editable cells */}
                      {currentBook.subjects.map((sub) => {
                        const scoreObj = stu.scores[sub];
                        const isEditing =
                          editingCell?.studentId === stu.id && editingCell?.subject === sub;

                        return (
                          <td
                            key={sub}
                            className="py-2 px-3 text-center border-l border-r border-slate-800/40"
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={editingCell.value}
                                  onChange={(e) =>
                                    setEditingCell({ ...editingCell, value: e.target.value })
                                  }
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveScoreEdit()}
                                  className="w-14 px-1.5 py-1 bg-slate-950 border border-blue-500 rounded text-center text-white text-xs font-bold focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveScoreEdit}
                                  className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  setEditingCell({
                                    studentId: stu.id,
                                    subject: sub,
                                    value: scoreObj !== undefined ? String(scoreObj.score) : '',
                                  })
                                }
                                className="cursor-pointer py-1 px-2 rounded hover:bg-slate-800/80 transition-colors flex items-center justify-center gap-1"
                                title="Nhấp đúp hoặc bấm để sửa điểm"
                              >
                                {scoreObj !== undefined ? (
                                  <span
                                    className={`font-mono font-bold ${
                                      scoreObj.score >= 8.0
                                        ? 'text-emerald-400'
                                        : scoreObj.score >= 5.0
                                        ? 'text-blue-400'
                                        : 'text-rose-400'
                                    }`}
                                  >
                                    {formatScore(scoreObj.score)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-mono">-</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* GPA */}
                      <td className="py-3 px-3 text-center bg-blue-950/15 font-mono font-extrabold text-blue-300">
                        {stu.gpa !== undefined ? formatScore(stu.gpa) : '-'}
                      </td>

                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        {stu.academicRank ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              stu.academicRank === 'Xuất sắc'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : stu.academicRank === 'Giỏi'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : stu.academicRank === 'Khá'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : stu.academicRank === 'Trung bình'
                                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {stu.academicRank}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa học sinh ${stu.name} khỏi lớp ${activeClass}?`)) {
                              onDeleteStudent(activeClass, stu.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm học sinh thủ công */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">
              Thêm học sinh mới vào Lớp {activeClass}
            </h3>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Số báo danh (SBD):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 12005"
                  value={newSbd}
                  onChange={(e) => setNewSbd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Họ và tên học sinh:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
