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
  Check,
  Edit2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { AnswerKey, ExamScanResult } from '../types';
import { evaluateExam, formatScore, getAcademicRank } from '../utils/gradingEngine';

interface ScanResultModalProps {
  initialScan: ExamScanResult;
  answerKeys: AnswerKey[];
  teacherClass: string;
  teacherSubject: string;
  onSaveToGradebook: (finalScan: ExamScanResult) => void;
  onClose: () => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  initialScan,
  answerKeys,
  teacherClass,
  teacherSubject,
  onSaveToGradebook,
  onClose,
}) => {
  const [scanData, setScanData] = useState<ExamScanResult>(initialScan);
  const [selectedTab, setSelectedTab] = useState<'p1' | 'p2' | 'p3'>('p1');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempName, setTempName] = useState(initialScan.studentName);
  const [tempSBD, setTempSBD] = useState(initialScan.studentSBD);
  const [tempClass, setTempClass] = useState(initialScan.className);
  const [tempSubject, setTempSubject] = useState(initialScan.subject);

  // Tự động tìm mã đề khớp với mã đề đọc được trên phiếu
  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => {
    // 1. Tìm theo mã đề đọc được trên phiếu
    const byCode = answerKeys.find((k) => k.examCode === initialScan.examCode);
    if (byCode) return byCode.id;
    // 2. Tìm theo mã đề và môn
    const bySubAndCode = answerKeys.find(
      (k) => k.subject === initialScan.subject && k.examCode === initialScan.examCode
    );
    if (bySubAndCode) return bySubAndCode.id;
    return answerKeys[0]?.id || '';
  });

  const activeKey = answerKeys.find((k) => k.id === selectedKeyId) || answerKeys[0];

  // Khởi động pháo hoa nếu điểm tốt (tính theo tỉ lệ thang điểm)
  useEffect(() => {
    const ratio = scanData.maxScore > 0 ? scanData.totalScore / scanData.maxScore : 0;
    if (ratio >= 0.8) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  // Chấm lại điểm khi giáo viên đổi đáp án hoặc sửa câu trả lời
  const reEvaluate = (
    newPart1 = scanData.part1,
    newPart2 = scanData.part2,
    newPart3 = scanData.part3,
    newKeyId = selectedKeyId,
    name = tempName,
    sbd = tempSBD,
    cls = tempClass,
    sub = tempSubject
  ) => {
    const key = answerKeys.find((k) => k.id === newKeyId) || answerKeys[0];
    if (!key) return;

    const evaluated = evaluateExam(
      {
        studentName: name,
        studentSBD: sbd,
        className: cls,
        subject: sub,
        examCode: key.examCode || scanData.examCode,
        part1: newPart1,
        part2: newPart2,
        part3: newPart3,
        rawImage: scanData.rawImage,
        confidence: scanData.confidence,
        notes: scanData.notes,
        detectedOnPaper: scanData.detectedOnPaper,
      },
      key
    );

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
    reEvaluate(
      scanData.part1,
      scanData.part2,
      scanData.part3,
      selectedKeyId,
      tempName,
      tempSBD,
      tempClass,
      tempSubject
    );
  };

  const handleConfirmSave = () => {
    onSaveToGradebook(scanData);
  };

  // Phát hiện sai khác giữa thông tin trên ảnh phiếu thi và cài đặt giáo viên
  const detectedPaper = scanData.detectedOnPaper;
  const isClassMismatch =
    detectedPaper?.className &&
    detectedPaper.className.trim() !== '' &&
    scanData.className.toLowerCase() !== detectedPaper.className.toLowerCase();

  const isSubjectMismatch =
    detectedPaper?.subject &&
    detectedPaper.subject.trim() !== '' &&
    scanData.subject.toLowerCase() !== detectedPaper.subject.toLowerCase();

  const isExamCodeMismatch =
    detectedPaper?.examCode &&
    detectedPaper.examCode.trim() !== '' &&
    scanData.examCode.trim() !== '' &&
    scanData.examCode.trim() !== detectedPaper.examCode.trim();

  const rank = getAcademicRank(scanData.totalScore, scanData.maxScore);
  const rankColors = {
    'Xuất sắc': 'from-amber-500 to-yellow-400 text-amber-950',
    'Giỏi': 'from-emerald-500 to-teal-400 text-emerald-950',
    'Khá': 'from-blue-500 to-indigo-400 text-blue-950',
    'Trung bình': 'from-amber-600 to-orange-400 text-amber-950',
    'Yếu': 'from-rose-600 to-red-400 text-rose-950',
  }[rank];

  const p1Limit = activeKey?.part1Count ?? 40;
  const p2Limit = activeKey?.part2Count ?? 8;
  const p3Limit = activeKey?.part3Count ?? 6;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner điểm & Thông tin thí sinh */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  KẾT QUẢ ĐỌC TRÊN PHIẾU
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(scanData.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              </div>

              {/* Tên học sinh (Đọc thật trên phiếu) */}
              {!isEditingInfo ? (
                <div className="mt-2 flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {scanData.studentName || <span className="text-slate-500 italic">Chưa ghi họ tên</span>}
                  </h2>
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Chỉnh sửa thông tin nếu bài ghi mờ"
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
                    placeholder="Họ và tên thí sinh"
                    className="px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempSBD}
                    onChange={(e) => setTempSBD(e.target.value)}
                    placeholder="SBD (để trống nếu HS không ghi)"
                    className="w-28 px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempClass}
                    onChange={(e) => setTempClass(e.target.value)}
                    placeholder="Lớp"
                    className="w-20 px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempSubject}
                    onChange={(e) => setTempSubject(e.target.value)}
                    placeholder="Môn thi"
                    className="w-24 px-2 py-1 bg-slate-950 border border-blue-500 rounded-md text-white text-sm font-semibold focus:outline-none"
                  />
                  <button
                    onClick={handleSaveInfo}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Lưu sửa
                  </button>
                </div>
              )}

              {/* Thông tin SBD, Lớp, Môn thi đọc được trên giấy */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <User className="w-3 h-3 text-blue-400" />
                  SBD: {scanData.studentSBD ? <strong className="text-white">{scanData.studentSBD}</strong> : <span className="text-amber-400 italic">Không ghi SBD</span>}
                </span>

                <span className="flex items-center gap-1 font-semibold bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <GraduationCap className="w-3 h-3 text-emerald-400" />
                  Lớp: {scanData.className || <span className="text-slate-500">Chưa rõ</span>}
                </span>

                <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  Môn: {scanData.subject}
                </span>

                <span className="flex items-center gap-1 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded text-purple-200 font-mono">
                  Mã đề: <strong>{scanData.examCode}</strong>
                </span>
              </div>
            </div>

            {/* Khung điểm số */}
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm font-mono">
                  {formatScore(scanData.totalScore)}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ {scanData.maxScore}</span>
              </div>
              <span className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r shadow-sm ${rankColors}`}>
                {rank}
              </span>
            </div>
          </div>

          {/* Cảnh báo nếu có sai khác thông tin trên giấy so với cài đặt của giáo viên */}
          {(isClassMismatch || isSubjectMismatch || isExamCodeMismatch) && (
            <div className="mt-3 p-3 bg-amber-950/60 border border-amber-500/60 rounded-xl text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Phát hiện sai khác thông tin trên phiếu:</span>
              </div>

              {isClassMismatch && (
                <div className="flex items-center justify-between gap-2">
                  <span>Trên phiếu ghi lớp: <strong>{detectedPaper?.className}</strong> (Đang chọn: {scanData.className})</span>
                  <button
                    onClick={() => {
                      const newCls = detectedPaper?.className || scanData.className;
                      setTempClass(newCls);
                      reEvaluate(scanData.part1, scanData.part2, scanData.part3, selectedKeyId, tempName, tempSBD, newCls, tempSubject);
                    }}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold shrink-0"
                  >
                    Dùng lớp {detectedPaper?.className}
                  </button>
                </div>
              )}

              {isSubjectMismatch && (
                <div className="flex items-center justify-between gap-2">
                  <span>Trên phiếu ghi môn: <strong>{detectedPaper?.subject}</strong> (Đang chọn: {scanData.subject})</span>
                  <button
                    onClick={() => {
                      const newSub = detectedPaper?.subject || scanData.subject;
                      setTempSubject(newSub);
                      reEvaluate(scanData.part1, scanData.part2, scanData.part3, selectedKeyId, tempName, tempSBD, tempClass, newSub);
                    }}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold shrink-0"
                  >
                    Dùng môn {detectedPaper?.subject}
                  </button>
                </div>
              )}

              {isExamCodeMismatch && (
                <div className="flex items-center justify-between gap-2">
                  <span>Mã đề trên phiếu: <strong>{detectedPaper?.examCode}</strong> (Đang chấm theo mã: {scanData.examCode})</span>
                  {answerKeys.some((k) => k.examCode === detectedPaper?.examCode) && (
                    <button
                      onClick={() => {
                        const matchingKey = answerKeys.find((k) => k.examCode === detectedPaper?.examCode);
                        if (matchingKey) handleKeyChange(matchingKey.id);
                      }}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold shrink-0"
                    >
                      Dùng mã {detectedPaper?.examCode}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dò mã đề & Chọn đáp án đối chiếu */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Đáp án chấm:</span>
              {answerKeys.length === 0 ? (
                <span className="text-rose-400 font-semibold">Chưa có mã đề nào trong hệ thống!</span>
              ) : (
                <select
                  value={selectedKeyId}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
                >
                  {answerKeys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.title} (Mã đề {k.examCode} - {k.part1Count ?? 40} câu P1)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
              <span className="text-blue-400">P.I: {formatScore(scanData.part1Score)}đ</span>
              {p2Limit > 0 && <span className="text-emerald-400">P.II: {formatScore(scanData.part2Score)}đ</span>}
              {p3Limit > 0 && <span className="text-purple-400">P.III: {formatScore(scanData.part3Score)}đ</span>}
            </div>
          </div>
        </div>

        {/* Tab chuyển đổi các phần thi */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setSelectedTab('p1')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              selectedTab === 'p1'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Phần I ({p1Limit} câu)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
              {formatScore(scanData.part1Score)}đ
            </span>
          </button>

          {p2Limit > 0 && (
            <button
              onClick={() => setSelectedTab('p2')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedTab === 'p2'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Phần II ({p2Limit} câu Đúng/Sai)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                {formatScore(scanData.part2Score)}đ
              </span>
            </button>
          )}

          {p3Limit > 0 && (
            <button
              onClick={() => setSelectedTab('p3')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedTab === 'p3'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Phần III ({p3Limit} câu số)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                {formatScore(scanData.part3Score)}đ
              </span>
            </button>
          )}
        </div>

        {/* Nội dung danh sách câu hỏi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PHẦN I */}
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

              {/* Lưới câu hỏi Phần 1 (chỉ hiện đúng số lượng câu hỏi p1Limit của đề) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: p1Limit }, (_, i) => i + 1).map((qNum) => {
                  const detail = scanData.part1Details[qNum];
                  const studentAns = scanData.part1[qNum];
                  const keyAns = detail?.key;

                  return (
                    <div
                      key={qNum}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        detail?.isCorrect
                          ? 'bg-emerald-950/40 border border-emerald-900/60'
                          : studentAns
                          ? 'bg-rose-950/40 border border-rose-900/60'
                          : 'bg-slate-900/50 border border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-300 w-6">
                          {qNum}.
                        </span>
                        {keyAns && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{keyAns}]
                          </span>
                        )}
                      </div>

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
          )}

          {/* TAB 2: PHẦN II (Đúng/Sai) */}
          {selectedTab === 'p2' && p2Limit > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: p2Limit }, (_, i) => i + 1).map((qNum) => {
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

          {/* TAB 3: PHẦN III (Điền số) */}
          {selectedTab === 'p3' && p3Limit > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: p3Limit }, (_, i) => i + 1).map((qNum) => {
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
                            Đáp án: <strong className="font-mono text-emerald-400">{keyAns}</strong>
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

        {/* Thanh tác vụ phía dưới modal */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chụp lại</span>
          </button>

          <button
            onClick={handleConfirmSave}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Lưu bài vào Bảng điểm Lớp {scanData.className}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
