import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  User,
  GraduationCap,
  Layers,
  ChevronRight,
  Check,
  Edit2
} from 'lucide-react';
import { AnswerKey, ExamScanResult } from '../types';
import { evaluateExam, formatScore, getAcademicRank } from '../utils/gradingEngine';

interface ScanResultModalProps {
  initialScan: ExamScanResult;
  answerKeys: AnswerKey[];
  onSaveToGradebook: (finalScan: ExamScanResult) => void;
  onClose: () => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  initialScan,
  answerKeys,
  onSaveToGradebook,
  onClose,
}) => {
  const [scanData, setScanData] = useState<ExamScanResult>(initialScan);
  const [selectedTab, setSelectedTab] = useState<'p1' | 'p2' | 'p3'>('p1');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempName, setTempName] = useState(initialScan.studentName);
  const [tempSBD, setTempSBD] = useState(initialScan.studentSBD);
  const [tempClass, setTempClass] = useState(initialScan.className);
  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => {
    const matched = answerKeys.find(
      (k) => k.subject === initialScan.subject && k.examCode === initialScan.examCode
    );
    return matched?.id || answerKeys[0]?.id || '';
  });

  // Launch confetti if score >= 8.0
  useEffect(() => {
    if (scanData.totalScore >= 8.0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // Ignore if canvas-confetti is not loaded
      }
    }
  }, []);

  // Re-grade when changing key or answers
  const reEvaluate = (
    newPart1 = scanData.part1,
    newPart2 = scanData.part2,
    newPart3 = scanData.part3,
    newKeyId = selectedKeyId
  ) => {
    const activeKey = answerKeys.find((k) => k.id === newKeyId) || answerKeys[0];
    if (!activeKey) return;

    const evaluated = evaluateExam(
      {
        studentName: tempName,
        studentSBD: tempSBD,
        className: tempClass,
        subject: activeKey.subject || scanData.subject,
        examCode: activeKey.examCode || scanData.examCode,
        part1: newPart1,
        part2: newPart2,
        part3: newPart3,
        rawImage: scanData.rawImage,
        confidence: scanData.confidence,
        notes: scanData.notes,
      },
      activeKey
    );

    // Keep same scan id
    setScanData({ ...evaluated, id: scanData.id });
  };

  const handleKeyChange = (keyId: string) => {
    setSelectedKeyId(keyId);
    reEvaluate(scanData.part1, scanData.part2, scanData.part3, keyId);
  };

  const handlePart1Change = (question: number, option: 'A' | 'B' | 'C' | 'D') => {
    const current = scanData.part1[question];
    const nextVal = current === option ? null : option;
    const updated = { ...scanData.part1, [question]: nextVal };
    reEvaluate(updated, scanData.part2, scanData.part3);
  };

  const handlePart2Toggle = (question: number, item: 'a' | 'b' | 'c' | 'd') => {
    const currentVal = scanData.part2[question]?.[item];
    let nextVal: boolean | null;
    if (currentVal === true) nextVal = false;
    else if (currentVal === false) nextVal = null;
    else nextVal = true;

    const updated = {
      ...scanData.part2,
      [question]: {
        ...(scanData.part2[question] || { a: null, b: null, c: null, d: null }),
        [item]: nextVal,
      },
    };
    reEvaluate(scanData.part1, updated, scanData.part3);
  };

  const handlePart3Change = (question: number, val: string) => {
    const updated = { ...scanData.part3, [question]: val.trim() || null };
    reEvaluate(scanData.part1, scanData.part2, updated);
  };

  const handleSaveInfo = () => {
    setIsEditingInfo(false);
    setScanData((prev) => ({
      ...prev,
      studentName: tempName.trim() || 'Học sinh',
      studentSBD: tempSBD.trim() || '0000',
      className: tempClass.trim() || prev.className,
    }));
  };

  const handleConfirmSave = () => {
    onSaveToGradebook(scanData);
  };

  const rank = getAcademicRank(scanData.totalScore);
  const rankColors = {
    'Xuất sắc': 'from-amber-500 to-yellow-400 text-amber-950',
    'Giỏi': 'from-emerald-500 to-teal-400 text-emerald-950',
    'Khá': 'from-blue-500 to-indigo-400 text-blue-950',
    'Trung bình': 'from-amber-600 to-orange-400 text-amber-950',
    'Yếu': 'from-rose-600 to-red-400 text-rose-950',
  }[rank];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Score Banner */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  KẾT QUẢ CHẤM TỰ ĐỘNG
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(scanData.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              </div>

              {/* Student Identity Display */}
              {!isEditingInfo ? (
                <div className="mt-2 flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {scanData.studentName}
                  </h2>
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Chỉnh sửa thông tin thí sinh"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Họ và tên"
                    className="px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempSBD}
                    onChange={(e) => setTempSBD(e.target.value)}
                    placeholder="SBD"
                    className="w-24 px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempClass}
                    onChange={(e) => setTempClass(e.target.value)}
                    placeholder="Lớp"
                    className="w-20 px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <button
                    onClick={handleSaveInfo}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Lưu
                  </button>
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <User className="w-3 h-3 text-blue-400" /> SBD: {scanData.studentSBD}
                </span>
                <span className="flex items-center gap-1 font-semibold bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <GraduationCap className="w-3 h-3 text-emerald-400" /> Lớp: {scanData.className}
                </span>
                <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <Layers className="w-3 h-3 text-indigo-400" /> Môn: {scanData.subject}
                </span>
              </div>
            </div>

            {/* Big Score Card */}
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {formatScore(scanData.totalScore)}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 10</span>
              </div>
              <span className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r shadow-sm ${rankColors}`}>
                {rank}
              </span>
            </div>
          </div>

          {/* Exam Key Switcher Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Đáp án chấm:</span>
              <select
                value={selectedKeyId}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                {answerKeys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.title} (Mã đề {k.examCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
              <span className="text-blue-400">P.I: {formatScore(scanData.part1Score)}đ</span>
              <span className="text-emerald-400">P.II: {formatScore(scanData.part2Score)}đ</span>
              <span className="text-purple-400">P.III: {formatScore(scanData.part3Score)}đ</span>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('p1')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              selectedTab === 'p1'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Phần I: 40 câu 4 Lựa chọn</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
              {formatScore(scanData.part1Score)}đ
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('p2')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              selectedTab === 'p2'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Phần II: Đúng / Sai</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
              {formatScore(scanData.part2Score)}đ
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('p3')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              selectedTab === 'p3'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Phần III: Trả lời ngắn</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
              {formatScore(scanData.part3Score)}đ
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PHAN I */}
          {selectedTab === 'p1' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Nhấn vào chữ cái để sửa nếu phát hiện nhận diện sai hoặc tẩy mờ:</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Đúng
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle className="w-3 h-3" /> Sai
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertCircle className="w-3 h-3" /> Trống
                  </span>
                </div>
              </div>

              {/* 40 Questions Grid in 4 columns (10 questions each, matching the paper) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { start: 1, end: 10, label: 'Cột 1 (Câu 1-10)' },
                  { start: 11, end: 20, label: 'Cột 2 (Câu 11-20)' },
                  { start: 21, end: 30, label: 'Cột 3 (Câu 21-30)' },
                  { start: 31, end: 40, label: 'Cột 4 (Câu 31-40)' },
                ].map((col) => (
                  <div key={col.label} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-400 pb-1.5 border-b border-slate-800 mb-2">
                      {col.label}
                    </div>
                    <div className="space-y-1.5">
                      {Array.from({ length: col.end - col.start + 1 }, (_, i) => col.start + i).map((qNum) => {
                        const detail = scanData.part1Details[qNum];
                        const studentAns = scanData.part1[qNum];
                        const keyAns = detail?.key;

                        return (
                          <div
                            key={qNum}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-colors ${
                              detail?.isCorrect
                                ? 'bg-emerald-950/30 border border-emerald-900/50'
                                : studentAns
                                ? 'bg-rose-950/30 border border-rose-900/50'
                                : 'bg-slate-900/50 border border-slate-800/50'
                            }`}
                          >
                            <span className="font-mono font-medium text-slate-300 w-6">
                              {qNum}.
                            </span>

                            {/* A, B, C, D choices */}
                            <div className="flex items-center gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                const isSelected = studentAns === opt;
                                const isTheKey = keyAns === opt;

                                let optClass = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                                if (isSelected && isTheKey) {
                                  optClass = 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400';
                                } else if (isSelected && !isTheKey) {
                                  optClass = 'bg-rose-600 text-white font-bold';
                                } else if (!isSelected && isTheKey) {
                                  optClass = 'bg-emerald-950/80 text-emerald-300 border border-dashed border-emerald-500/80';
                                }

                                return (
                                  <button
                                    key={opt}
                                    onClick={() => handlePart1Change(qNum, opt)}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-transform active:scale-90 ${optClass}`}
                                    title={`Câu ${qNum}: Chọn ${opt}`}
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

          {/* TAB 2: PHAN II (Dung/Sai) */}
          {selectedTab === 'p2' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
                <span>Quy chế BGD 2025: Đúng 1 ý: 0.1đ • Đúng 2 ý: 0.25đ • Đúng 3 ý: 0.5đ • Đúng 4 ý: 1.0đ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 8 }, (_, i) => i + 1).map((qNum) => {
                  const detail = scanData.part2Details[qNum];
                  const studentQ = scanData.part2[qNum] || { a: null, b: null, c: null, d: null };

                  return (
                    <div
                      key={qNum}
                      className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-sm text-white">Câu {qNum}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-mono">
                            Đúng {detail?.correctCount ?? 0}/4 ý
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            +{formatScore(detail?.scoreGained ?? 0)}đ
                          </span>
                        </div>
                      </div>

                      {/* 4 sub-questions: a, b, c, d */}
                      <div className="mt-2.5 space-y-2">
                        {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                          const itemDetail = detail?.items[letter];
                          const studentVal = studentQ[letter];
                          const keyVal = itemDetail?.key;

                          return (
                            <div
                              key={letter}
                              className={`flex items-center justify-between p-1.5 rounded-lg text-xs ${
                                itemDetail?.isCorrect
                                  ? 'bg-emerald-950/30 border border-emerald-900/40'
                                  : studentVal !== null
                                  ? 'bg-rose-950/30 border border-rose-900/40'
                                  : 'bg-slate-900/40 border border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="font-bold text-slate-300 uppercase">{letter})</span>
                                <span className="text-[11px] text-slate-400">
                                  Đáp án: {keyVal ? 'Đúng' : 'Sai'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handlePart2Toggle(qNum, letter)}
                                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                                    studentVal === true
                                      ? 'bg-emerald-600 text-white shadow'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  Đúng
                                </button>
                                <button
                                  onClick={() => handlePart2Toggle(qNum, letter)}
                                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                                    studentVal === false
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

          {/* TAB 3: PHAN III (Tra loi ngan) */}
          {selectedTab === 'p3' && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-xl text-xs text-purple-200">
                <span>Dạng điền số (Tối đa 6 câu, mỗi câu gồm 4 cột số, dấu '-' và dấu ',')</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }, (_, i) => i + 1).map((qNum) => {
                  const detail = scanData.part3Details[qNum];
                  const studentAns = scanData.part3[qNum] || '';
                  const keyAns = detail?.key || '-';

                  return (
                    <div
                      key={qNum}
                      className={`p-3 rounded-xl border flex flex-col justify-between ${
                        detail?.isCorrect
                          ? 'bg-emerald-950/20 border-emerald-900/50'
                          : studentAns
                          ? 'bg-rose-950/20 border-rose-900/50'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-sm text-white">Câu {qNum}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">
                            Đáp án chuẩn: <strong className="font-mono text-emerald-400">{keyAns}</strong>
                          </span>
                          {detail?.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-400 shrink-0">Học sinh tô:</span>
                        <input
                          type="text"
                          value={studentAns}
                          onChange={(e) => handlePart3Change(qNum, e.target.value)}
                          placeholder="Chưa tô hoặc trống"
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chụp lại</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmSave}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu vào Bảng điểm Lớp {scanData.className}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
