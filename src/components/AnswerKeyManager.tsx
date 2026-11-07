import React, { useState } from 'react';
import {
  Key,
  Plus,
  Save,
  Trash2,
  CheckCircle,
  HelpCircle,
  Settings,
  Layers,
  ArrowRight,
  Calculator,
  RotateCcw
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

  // Form tạo mã đề mới - hoàn toàn do giáo viên tự nhập, không có đáp án mẫu
  const [newSubject, setNewSubject] = useState('Toán');
  const [newExamCode, setNewExamCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newP1Count, setNewP1Count] = useState<number>(40);
  const [newP1Point, setNewP1Point] = useState<number>(0.25);
  const [newP2Count, setNewP2Count] = useState<number>(8);
  const [newP2Point, setNewP2Point] = useState<number>(1.0);
  const [newP3Count, setNewP3Count] = useState<number>(6);
  const [newP3Point, setNewP3Point] = useState<number>(0.5);

  const currentKey = answerKeys.find((k) => k.id === selectedKeyId) || answerKeys[0];

  // Tính tổng điểm toàn bài theo số câu hỏi giáo viên chọn
  const calculateTotalScore = (
    p1Count: number,
    p1Pt: number,
    p2Count: number,
    p2Pt: number,
    p3Count: number,
    p3Pt: number
  ) => {
    return Math.round((p1Count * p1Pt + p2Count * p2Pt + p3Count * p3Pt) * 100) / 100;
  };

  const calculatedNewMax = calculateTotalScore(
    newP1Count,
    newP1Point,
    newP2Count,
    newP2Point,
    newP3Count,
    newP3Point
  );

  // Cập nhật đáp án Phần I
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

  // Cập nhật đáp án Phần II
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

  // Cập nhật đáp án Phần III
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

  // Cập nhật cấu hình số lượng câu hỏi và thang điểm cho đề hiện tại
  const handleUpdateCurrentKeyConfig = (
    part1Count: number,
    part1PerQuestion: number,
    part2Count: number,
    part3Count: number,
    part3PerQuestion: number
  ) => {
    if (!currentKey) return;
    const maxScale = calculateTotalScore(
      part1Count,
      part1PerQuestion,
      part2Count,
      1.0,
      part3Count,
      part3PerQuestion
    );

    const updated: AnswerKey = {
      ...currentKey,
      part1Count,
      part2Count,
      part3Count,
      scoringConfig: {
        ...currentKey.scoringConfig,
        part1PerQuestion,
        part3PerQuestion,
        maxScale,
      },
      updatedAt: new Date().toISOString(),
    };
    onSaveKey(updated);
  };

  // Xóa trắng toàn bộ đáp án của mã đề hiện tại để nhập lại từ đầu
  const handleClearAllAnswers = () => {
    if (!currentKey) return;
    if (confirm(`Bạn có chắc muốn xóa sạch toàn bộ đáp án đã nhập của Mã đề ${currentKey.examCode}?`)) {
      const emptyPart1: Record<number, any> = {};
      for (let i = 1; i <= currentKey.part1Count; i++) {
        emptyPart1[i] = null;
      }
      const emptyPart2: Record<number, any> = {};
      for (let i = 1; i <= currentKey.part2Count; i++) {
        emptyPart2[i] = { a: null, b: null, c: null, d: null };
      }
      const emptyPart3: Record<number, any> = {};
      for (let i = 1; i <= currentKey.part3Count; i++) {
        emptyPart3[i] = '';
      }

      const updated = {
        ...currentKey,
        part1: emptyPart1,
        part2: emptyPart2,
        part3: emptyPart3,
        updatedAt: new Date().toISOString(),
      };
      onSaveKey(updated);
    }
  };

  // Tạo mã đề mới - hoàn toàn trống rỗng, để giáo viên tự nhập từ đầu
  const handleCreateNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamCode.trim()) {
      alert('Vui lòng nhập Mã đề thi (ví dụ: 101, 102, 1101)');
      return;
    }

    // Khởi tạo các câu hỏi trống rỗng (null), không tự điền bất kỳ đáp án nào
    const emptyPart1: Record<number, any> = {};
    for (let i = 1; i <= newP1Count; i++) {
      emptyPart1[i] = null;
    }

    const emptyPart2: Record<number, any> = {};
    for (let i = 1; i <= newP2Count; i++) {
      emptyPart2[i] = { a: false, b: false, c: false, d: false };
    }

    const emptyPart3: Record<number, any> = {};
    for (let i = 1; i <= newP3Count; i++) {
      emptyPart3[i] = '';
    }

    const newKey: AnswerKey = {
      id: 'key-' + Date.now(),
      title: newTitle.trim() || `Đề ${newSubject} - Mã ${newExamCode.trim()}`,
      subject: newSubject,
      examCode: newExamCode.trim(),
      part1Count: newP1Count,
      part2Count: newP2Count,
      part3Count: newP3Count,
      scoringConfig: {
        part1PerQuestion: newP1Point,
        part2Rules: [0.1, 0.25, 0.5, newP2Point],
        part3PerQuestion: newP3Point,
        maxScale: calculatedNewMax,
      },
      part1: emptyPart1,
      part2: emptyPart2,
      part3: emptyPart3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveKey(newKey);
    setSelectedKeyId(newKey.id);
    setShowCreateModal(false);
    setNewExamCode('');
    setNewTitle('');
  };

  // Đếm số câu giáo viên đã nhập đáp án
  const countAnsweredP1 = currentKey
    ? Object.keys(currentKey.part1).filter((q) => Number(q) <= currentKey.part1Count && currentKey.part1[Number(q)] !== null).length
    : 0;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Banner đầu trang */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Quản Lý Đáp Án & Cấu Hình Thang Điểm</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Giáo viên tự tạo mã đề, chọn tổng số câu hỏi cho từng phần, tự nhập đáp án từ đầu và tự động tính toán tổng điểm bài thi.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm mã đề mới</span>
        </button>
      </div>

      {/* Danh sách các mã đề hiện có */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium shrink-0">Mã đề:</span>
        {answerKeys.length === 0 ? (
          <span className="text-slate-500 italic">Chưa có mã đề nào. Hãy bấm "Thêm mã đề mới" để tạo đáp án từ đầu.</span>
        ) : (
          answerKeys.map((k) => (
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
          ))
        )}
      </div>

      {currentKey && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Thông tin mã đề & Cấu hình số câu hỏi */}
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">{currentKey.title}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Mã đề: {currentKey.examCode}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Môn: {currentKey.subject}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tổng điểm tối đa: {currentKey.scoringConfig?.maxScale ?? 10}đ
                </span>
              </div>

              <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span>Phần I: <strong className="text-slate-200">{currentKey.part1Count ?? 40} câu</strong> ({currentKey.scoringConfig?.part1PerQuestion ?? 0.25}đ/câu)</span>
                <span>Phần II: <strong className="text-slate-200">{currentKey.part2Count ?? 8} câu</strong> (Đúng/Sai)</span>
                <span>Phần III: <strong className="text-slate-200">{currentKey.part3Count ?? 6} câu</strong> ({currentKey.scoringConfig?.part3PerQuestion ?? 0.5}đ/câu)</span>
                <span className="text-emerald-400">Đã nhập: {countAnsweredP1}/{currentKey.part1Count ?? 40} câu P.I</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAllAnswers}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                title="Xóa trắng để nhập lại từ đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa trắng đáp án</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn xóa mã đề ${currentKey.examCode}?`)) {
                    onDeleteKey(currentKey.id);
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                title="Xóa mã đề này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('p1')}
              className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 ${
                activeTab === 'p1'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Phần I ({currentKey.part1Count ?? 40} câu trắc nghiệm)
            </button>

            {currentKey.part2Count > 0 && (
              <button
                onClick={() => setActiveTab('p2')}
                className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'p2'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Phần II ({currentKey.part2Count} câu Đúng/Sai)
              </button>
            )}

            {currentKey.part3Count > 0 && (
              <button
                onClick={() => setActiveTab('p3')}
                className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'p3'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Phần III ({currentKey.part3Count} câu điền số)
              </button>
            )}

            <button
              onClick={() => setActiveTab('config')}
              className={`pb-2.5 px-3 border-b-2 transition-colors shrink-0 ${
                activeTab === 'config'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Cấu hình số câu & Thang điểm
            </button>
          </div>

          {/* Nội dung Tab */}
          <div className="p-4">
            {/* TAB PHẦN I */}
            {activeTab === 'p1' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Nhấp vào A, B, C, D để đặt đáp án đúng (tổng số: {currentKey.part1Count ?? 40} câu):</span>
                  <span className="font-mono text-emerald-400">
                    Đã nhập {countAnsweredP1}/{currentKey.part1Count ?? 40} câu
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {Array.from({ length: currentKey.part1Count ?? 40 }, (_, i) => i + 1).map((qNum) => {
                    const ans = currentKey.part1[qNum];

                    return (
                      <div
                        key={qNum}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          ans
                            ? 'bg-blue-950/40 border-blue-800/60'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <span className="font-mono font-bold text-slate-300 w-6">
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
                                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-105'
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
            )}

            {/* TAB PHẦN II */}
            {activeTab === 'p2' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Chọn Đúng hoặc Sai cho từng mệnh đề a), b), c), d) cho {currentKey.part2Count} câu hỏi:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: currentKey.part2Count }, (_, i) => i + 1).map((qNum) => {
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
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                      val === true
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePart2(qNum, letter, false)}
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                      val === false
                                        ? 'bg-rose-600 text-white shadow'
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

            {/* TAB PHẦN III */}
            {activeTab === 'p3' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Nhập số đáp án đúng cho {currentKey.part3Count} câu trả lời ngắn:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: currentKey.part3Count }, (_, i) => i + 1).map((qNum) => {
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
                          placeholder="Nhập số đáp án (ví dụ: 12 hoặc -3.5)"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CẤU HÌNH SỐ CÂU & THANG ĐIỂM */}
            {activeTab === 'config' && (
              <div className="space-y-4 max-w-xl">
                <h4 className="font-bold text-sm text-white">
                  Tùy chỉnh số lượng câu hỏi và điểm cho đề thi {currentKey.examCode}
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-slate-400 mb-1">Số câu hỏi Phần I (Trắc nghiệm):</label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={currentKey.part1Count ?? 40}
                        onChange={(e) =>
                          handleUpdateCurrentKeyConfig(
                            Number(e.target.value) || 40,
                            currentKey.scoringConfig?.part1PerQuestion ?? 0.25,
                            currentKey.part2Count,
                            currentKey.part3Count,
                            currentKey.scoringConfig?.part3PerQuestion ?? 0.5
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Điểm mỗi câu Phần I:</label>
                      <input
                        type="number"
                        step="0.05"
                        value={currentKey.scoringConfig?.part1PerQuestion ?? 0.25}
                        onChange={(e) =>
                          handleUpdateCurrentKeyConfig(
                            currentKey.part1Count,
                            Number(e.target.value) || 0.25,
                            currentKey.part2Count,
                            currentKey.part3Count,
                            currentKey.scoringConfig?.part3PerQuestion ?? 0.5
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-slate-400 mb-1">Số câu hỏi Phần II (Đúng/Sai):</label>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={currentKey.part2Count ?? 8}
                        onChange={(e) =>
                          handleUpdateCurrentKeyConfig(
                            currentKey.part1Count,
                            currentKey.scoringConfig?.part1PerQuestion ?? 0.25,
                            Number(e.target.value) || 0,
                            currentKey.part3Count,
                            currentKey.scoringConfig?.part3PerQuestion ?? 0.5
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Số câu hỏi Phần III (Điền số):</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={currentKey.part3Count ?? 6}
                        onChange={(e) =>
                          handleUpdateCurrentKeyConfig(
                            currentKey.part1Count,
                            currentKey.scoringConfig?.part1PerQuestion ?? 0.25,
                            currentKey.part2Count,
                            Number(e.target.value) || 0,
                            currentKey.scoringConfig?.part3PerQuestion ?? 0.5
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between">
                    <span className="text-blue-300 font-semibold">Tổng điểm tối đa toàn bài thi:</span>
                    <span className="text-xl font-bold text-white font-mono">
                      {currentKey.scoringConfig?.maxScale} điểm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO MÃ ĐỀ MỚI - TỰ NHẬP TỪ ĐẦU, TỰ CHỌN SỐ CÂU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg shadow-2xl my-8">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              <span>Tạo Mã Đề Mới (Tự Nhập Từ Đầu)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Không có đáp án điền sẵn. Bạn sẽ tự chọn số câu hỏi và tự nhấp để chọn đáp án đúng.
            </p>

            <form onSubmit={handleCreateNewKey} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mã đề thi * :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 101, 102, 1101"
                    value={newExamCode}
                    onChange={(e) => setNewExamCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Môn thi:</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {POPULAR_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên đề thi (tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kiểm tra 1 tiết học kì 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Lựa chọn số câu hỏi cho từng phần */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1.5">
                  Lựa chọn số lượng câu hỏi và thang điểm:
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Số câu Phần I (Trắc nghiệm):</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={newP1Count}
                      onChange={(e) => setNewP1Count(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Điểm mỗi câu Phần I:</label>
                    <input
                      type="number"
                      step="0.05"
                      value={newP1Point}
                      onChange={(e) => setNewP1Point(Number(e.target.value) || 0.25)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Số câu Phần II (Đúng/Sai):</label>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={newP2Count}
                      onChange={(e) => setNewP2Count(Math.min(8, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Số câu Phần III (Điền số):</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={newP3Count}
                      onChange={(e) => setNewP3Count(Math.min(6, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-semibold">
                  <span className="text-amber-300">Tổng điểm toàn bài thi:</span>
                  <span className="text-base font-bold text-white font-mono">
                    {calculatedNewMax} điểm
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25"
                >
                  Tạo mã đề & Bắt đầu nhập đáp án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
