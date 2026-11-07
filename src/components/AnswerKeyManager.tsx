import React, { useState } from 'react';
import {
  Key,
  Plus,
  Save,
  Copy,
  Trash2,
  CheckCircle,
  HelpCircle,
  Settings,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AnswerKey } from '../types';
import { POPULAR_SUBJECTS } from '../utils/defaultAnswerKeys';

interface AnswerKeyManagerProps {
  answerKeys: AnswerKey[];
  onSaveKey: (key: AnswerKey) => void;
  onDeleteKey: (keyId: string) => void;
}

export const AnswerKeyManager: React.FC<AnswerKeyManagerProps> = ({
  answerKeys,
  onSaveKey,
  onDeleteKey,
}) => {
  const [selectedKeyId, setSelectedKeyId] = useState<string>(answerKeys[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'p3' | 'config'>('p1');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New key form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Toán');
  const [newExamCode, setNewExamCode] = useState('103');

  const currentKey = answerKeys.find((k) => k.id === selectedKeyId) || answerKeys[0];

  const handleUpdatePart1 = (question: number, option: 'A' | 'B' | 'C' | 'D') => {
    if (!currentKey) return;
    const currentAns = currentKey.part1[question];
    const newAns = currentAns === option ? null : option;
    const updated = {
      ...currentKey,
      part1: { ...currentKey.part1, [question]: newAns },
      updatedAt: new Date().toISOString(),
    };
    onSaveKey(updated);
  };

  const handleUpdatePart2 = (question: number, item: 'a' | 'b' | 'c' | 'd', val: boolean) => {
    if (!currentKey) return;
    const qObj = currentKey.part2[question] || { a: false, b: false, c: false, d: false };
    const updated = {
      ...currentKey,
      part2: {
        ...currentKey.part2,
        [question]: { ...qObj, [item]: val },
      },
      updatedAt: new Date().toISOString(),
    };
    onSaveKey(updated);
  };

  const handleUpdatePart3 = (question: number, val: string) => {
    if (!currentKey) return;
    const updated = {
      ...currentKey,
      part3: {
        ...currentKey.part3,
        [question]: val,
      },
      updatedAt: new Date().toISOString(),
    };
    onSaveKey(updated);
  };

  const handleCreateNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamCode.trim()) return;

    // Build fresh 40-question template
    const part1: Record<number, any> = {};
    const defaultCycle = ['A', 'B', 'C', 'D'] as const;
    for (let i = 1; i <= 40; i++) {
      part1[i] = defaultCycle[(i - 1) % 4];
    }

    const part2: Record<number, any> = {};
    for (let i = 1; i <= 8; i++) {
      part2[i] = { a: true, b: false, c: true, d: false };
    }

    const part3: Record<number, any> = {
      1: '10',
      2: '2.5',
      3: '0.5',
      4: '100',
      5: '35',
      6: '4',
    };

    const newKey: AnswerKey = {
      id: 'key-' + Date.now(),
      title: newTitle.trim() || `Đề thi ${newSubject} - Mã ${newExamCode}`,
      subject: newSubject,
      examCode: newExamCode.trim(),
      scoringConfig: {
        part1PerQuestion: 0.25,
        part2Rules: [0.1, 0.25, 0.5, 1.0],
        part3PerQuestion: 0.5,
        maxScale: 10.0,
      },
      part1,
      part2,
      part3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveKey(newKey);
    setSelectedKeyId(newKey.id);
    setShowCreateModal(false);
    setNewTitle('');
  };

  const handleCloneCurrent = () => {
    if (!currentKey) return;
    const cloned: AnswerKey = {
      ...currentKey,
      id: 'key-' + Date.now(),
      title: `${currentKey.title} (Bản sao)`,
      examCode: String(Number(currentKey.examCode) + 1 || currentKey.examCode + '-COPY'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveKey(cloned);
    setSelectedKeyId(cloned.id);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Quản Lý Đáp Án & Thang Điểm (Ma Trận Đề)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cấu hình đáp án chuẩn cho từng mã đề và môn học theo mẫu phiếu QM 2025 - CV 1239.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mã đề mới</span>
          </button>
        </div>
      </div>

      {/* Selector of Existing Keys */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium shrink-0">Danh sách đề:</span>
        {answerKeys.map((k) => (
          <button
            key={k.id}
            onClick={() => setSelectedKeyId(k.id)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              currentKey?.id === k.id
                ? 'bg-amber-500 text-amber-950 font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{k.subject}</span>
            <span className="font-mono bg-black/20 px-1.5 py-0.2 rounded text-[10px]">
              Mã {k.examCode}
            </span>
          </button>
        ))}
      </div>

      {currentKey && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Key Header Details */}
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{currentKey.title}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Mã đề: {currentKey.examCode}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Môn: {currentKey.subject}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Thang điểm BGD 2025: Phần I (0.25đ/câu), Phần II (0.1, 0.25, 0.5, 1.0đ), Phần III (0.5đ/câu)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCloneCurrent}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
                title="Nhân bản mã đề này"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Nhân bản</span>
              </button>

              {answerKeys.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Bạn có chắc muốn xóa đáp án ${currentKey.title}?`)) {
                      onDeleteKey(currentKey.id);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                  title="Xóa mã đề này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('p1')}
              className={`pb-2.5 px-3 border-b-2 transition-colors ${
                activeTab === 'p1'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Phần I: 40 câu trắc nghiệm (A, B, C, D)
            </button>
            <button
              onClick={() => setActiveTab('p2')}
              className={`pb-2.5 px-3 border-b-2 transition-colors ${
                activeTab === 'p2'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Phần II: 8 câu Đúng / Sai (a, b, c, d)
            </button>
            <button
              onClick={() => setActiveTab('p3')}
              className={`pb-2.5 px-3 border-b-2 transition-colors ${
                activeTab === 'p3'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Phần III: 6 câu điền số
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* PART I EDITOR */}
            {activeTab === 'p1' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Nhấp vào chữ cái A, B, C, D để đặt đáp án đúng cho từng câu hỏi:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { start: 1, end: 10, label: 'Cột 1 (Câu 1-10)' },
                    { start: 11, end: 20, label: 'Cột 2 (Câu 11-20)' },
                    { start: 21, end: 30, label: 'Cột 3 (Câu 21-30)' },
                    { start: 31, end: 40, label: 'Cột 4 (Câu 31-40)' },
                  ].map((col) => (
                    <div
                      key={col.label}
                      className="bg-slate-950/70 p-3 rounded-xl border border-slate-800"
                    >
                      <div className="text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800 mb-2">
                        {col.label}
                      </div>

                      <div className="space-y-1.5">
                        {Array.from(
                          { length: col.end - col.start + 1 },
                          (_, i) => col.start + i
                        ).map((qNum) => {
                          const ans = currentKey.part1[qNum];

                          return (
                            <div
                              key={qNum}
                              className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                            >
                              <span className="font-mono font-medium text-slate-300 w-6">
                                {qNum}.
                              </span>

                              <div className="flex items-center gap-1">
                                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                  const isSelected = ans === opt;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleUpdatePart1(qNum, opt)}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        isSelected
                                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PART II EDITOR */}
            {activeTab === 'p2' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Chọn Đúng hoặc Sai cho từng mệnh đề a), b), c), d) trong 8 câu hỏi:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((qNum) => {
                    const qObj = currentKey.part2[qNum] || { a: false, b: false, c: false, d: false };

                    return (
                      <div
                        key={qNum}
                        className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between"
                      >
                        <div className="font-bold text-sm text-white pb-2 border-b border-slate-800 mb-2">
                          Câu {qNum}
                        </div>

                        <div className="space-y-2">
                          {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                            const val = qObj[letter];

                            return (
                              <div
                                key={letter}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                              >
                                <span className="font-bold text-slate-300 uppercase">
                                  {letter})
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleUpdatePart2(qNum, letter, true)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                      val === true
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePart2(qNum, letter, false)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                      val === false
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PART III EDITOR */}
            {activeTab === 'p3' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Nhập số đáp án cho 6 câu trả lời ngắn (có thể là số nguyên, số âm, hoặc số thập phân như "12", "-3.5", "0.25"):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((qNum) => {
                    const currentVal = currentKey.part3[qNum] || '';

                    return (
                      <div
                        key={qNum}
                        className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl"
                      >
                        <div className="font-bold text-sm text-white mb-2">
                          Câu {qNum}
                        </div>
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleUpdatePart3(qNum, e.target.value)}
                          placeholder="Ví dụ: 12 hoặc -3.5"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Tạo mã đề mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">
              Tạo Ma Trận Đáp Án / Mã Đề Mới
            </h3>
            <form onSubmit={handleCreateNewKey} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mã đề (3 hoặc 4 chữ số):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 105"
                  value={newExamCode}
                  onChange={(e) => setNewExamCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Môn thi:</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {POPULAR_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tên tiêu đề đề thi:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đề Kiểm Tra Định Kì Giữa Kì 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Khởi tạo mã đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
