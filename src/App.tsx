import React, { useState, useEffect } from 'react';
import {
  Camera,
  FileSpreadsheet,
  History,
  Key,
  BarChart3,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Header } from './components/Header';
import { ScannerView } from './components/ScannerView';
import { ScanResultModal } from './components/ScanResultModal';
import { GradebookView } from './components/GradebookView';
import { ExamHistoryView } from './components/ExamHistoryView';
import { AnswerKeyManager } from './components/AnswerKeyManager';
import { ReportsAnalyticsView } from './components/ReportsAnalyticsView';
import { SuccessToast, ToastMessage } from './components/SuccessToast';
import {
  AnswerKey,
  ClassGradebook,
  ExamScanResult,
  ScanApiResponse
} from './types';
import {
  deleteExamScan,
  deleteStudentFromClass,
  loadActiveSession,
  loadAnswerKeys,
  loadExamHistory,
  loadGradebooks,
  saveActiveSession,
  saveExamScan,
  saveGradebooks,
  saveSingleAnswerKey,
  syncScanToGradebook,
  updateStudentScoreManually
} from './utils/storage';
import { evaluateExam } from './utils/gradingEngine';
import { exportGradebookToExcel } from './utils/excelExporter';

export default function App() {
  // Session parameters: Class, Subject, Exam Code
  const [session, setSession] = useState(() => loadActiveSession());
  const [activeTab, setActiveTab] = useState<'scan' | 'gradebook' | 'history' | 'keys' | 'reports'>('scan');

  // Core Data
  const [gradebooks, setGradebooks] = useState<Record<string, ClassGradebook>>(() => loadGradebooks());
  const [examHistory, setExamHistory] = useState<ExamScanResult[]>(() => loadExamHistory());
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>(() => loadAnswerKeys());

  // Active Scan Modal
  const [currentScanResult, setCurrentScanResult] = useState<ExamScanResult | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keep session synced
  useEffect(() => {
    saveActiveSession(session);
  }, [session]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string, subInfo?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message, subInfo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // When AI or camera finishes scanning paper
  const handleScanComplete = (extractedData: ScanApiResponse['data'], rawImage: string) => {
    if (!extractedData) return;

    // Determine which answer key to evaluate with
    const targetCode =
      session.examCode === 'AUTO' ? extractedData.examCode || '101' : session.examCode;

    // Find key matching subject and examCode, or fallback
    let matchedKey = answerKeys.find(
      (k) => k.subject === session.subject && k.examCode === targetCode
    );
    if (!matchedKey) {
      matchedKey = answerKeys.find((k) => k.examCode === targetCode) || answerKeys[0];
    }

    const evaluated = evaluateExam(
      {
        studentName: extractedData.studentName,
        studentSBD: extractedData.studentSBD,
        className: extractedData.className || session.className,
        subject: session.subject,
        examCode: targetCode,
        part1: extractedData.part1,
        part2: extractedData.part2,
        part3: extractedData.part3,
        rawImage,
        confidence: extractedData.confidence,
        notes: extractedData.rawOcrNotes,
      },
      matchedKey
    );

    setCurrentScanResult(evaluated);
  };

  // Save scan result to Gradebook with automatic column creation for new subjects
  const handleSaveToGradebook = (finalScan: ExamScanResult) => {
    // 1. Sync to gradebook
    const syncRes = syncScanToGradebook(finalScan);

    // 2. Save to history
    const updatedHistory = saveExamScan(finalScan);
    setExamHistory(updatedHistory);

    // 3. Reload gradebooks in state
    const updatedBooks = loadGradebooks();
    setGradebooks(updatedBooks);

    // 4. Close modal
    setCurrentScanResult(null);

    // 5. Toast notice with clear information
    const subNotice = syncRes.isNewSubject
      ? `Đã tự động tạo thêm cột môn mới [${syncRes.subject}] trong bảng điểm!`
      : `Đã cập nhật điểm môn [${syncRes.subject}].`;

    addToast(
      'success',
      'ĐÃ LƯU BÀI CHẤM THÀNH CÔNG!',
      `Học sinh: ${finalScan.studentName} (SBD: ${finalScan.studentSBD}) • Điểm: ${finalScan.totalScore}/10`,
      `Lớp ${finalScan.className} • Môn ${finalScan.subject} • ${subNotice}`
    );
  };

  // Continuous rapid batch save without modal interruption
  const handleRapidSave = (extractedData: ScanApiResponse['data'], rawImage: string): ExamScanResult | null => {
    if (!extractedData) return null;

    const targetCode =
      session.examCode === 'AUTO' ? extractedData.examCode || '101' : session.examCode;

    let matchedKey = answerKeys.find(
      (k) => k.subject === session.subject && k.examCode === targetCode
    );
    if (!matchedKey) {
      matchedKey = answerKeys.find((k) => k.examCode === targetCode) || answerKeys[0];
    }

    const evaluated = evaluateExam(
      {
        studentName: extractedData.studentName,
        studentSBD: extractedData.studentSBD,
        className: extractedData.className || session.className,
        subject: session.subject,
        examCode: targetCode,
        part1: extractedData.part1,
        part2: extractedData.part2,
        part3: extractedData.part3,
        rawImage,
        confidence: extractedData.confidence,
        notes: extractedData.rawOcrNotes,
      },
      matchedKey
    );

    // Save directly to gradebook and history
    const syncRes = syncScanToGradebook(evaluated);
    const updatedHistory = saveExamScan(evaluated);
    setExamHistory(updatedHistory);
    setGradebooks(loadGradebooks());

    const subNotice = syncRes.isNewSubject
      ? `(Đã tạo thêm cột môn [${syncRes.subject}])`
      : '';

    addToast(
      'success',
      `⚡ ĐÃ CHẤM XONG: ${evaluated.studentName} (${evaluated.totalScore}đ)`,
      `SBD: ${evaluated.studentSBD} • Lớp ${evaluated.className} • Môn ${evaluated.subject} ${subNotice}`
    );

    return evaluated;
  };

  // Gradebook manipulations
  const handleUpdateScore = (className: string, studentId: string, subject: string, score: number) => {
    updateStudentScoreManually(className, studentId, subject, score);
    setGradebooks(loadGradebooks());
    addToast('success', 'Đã lưu điểm sửa thủ công', `Điểm môn ${subject} đã cập nhật thành ${score}đ`);
  };

  const handleDeleteStudent = (className: string, studentId: string) => {
    deleteStudentFromClass(className, studentId);
    setGradebooks(loadGradebooks());
    addToast('info', 'Đã xóa học sinh', `Đã xóa khỏi danh sách lớp ${className}`);
  };

  const handleAddStudent = (className: string, sbd: string, name: string) => {
    const current = loadGradebooks();
    let book = current[className];
    if (!book) {
      book = {
        className,
        subjects: [session.subject],
        students: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    book.students.push({
      id: 'stu-' + Date.now(),
      sbd,
      name,
      className,
      scores: {},
      updatedAt: new Date().toISOString(),
    });
    book.students.sort((a, b) => a.sbd.localeCompare(b.sbd, undefined, { numeric: true }));
    current[className] = book;
    saveGradebooks(current);
    setGradebooks({ ...current });
    addToast('success', 'Đã thêm học sinh mới', `${name} (SBD: ${sbd}) vào lớp ${className}`);
  };

  const handleAddSubject = (className: string, subjectName: string) => {
    const current = loadGradebooks();
    const book = current[className];
    if (book && !book.subjects.includes(subjectName)) {
      book.subjects.push(subjectName);
      saveGradebooks(current);
      setGradebooks({ ...current });
      addToast('success', 'Đã thêm cột môn mới', `Môn [${subjectName}] đã được thêm vào bảng điểm lớp ${className}`);
    }
  };

  // History manipulations
  const handleDeleteScan = (id: string) => {
    const updated = deleteExamScan(id);
    setExamHistory(updated);
    addToast('info', 'Đã xóa bài thi khỏi lịch sử', 'Bản ghi lịch sử đã được xóa.');
  };

  // Answer key save
  const handleSaveKey = (key: AnswerKey) => {
    const updated = saveSingleAnswerKey(key);
    setAnswerKeys(updated);
    addToast('success', 'Đã lưu đáp án', `Mã đề ${key.examCode} môn ${key.subject} đã cập nhật.`);
  };

  const handleDeleteKey = (keyId: string) => {
    const updated = answerKeys.filter((k) => k.id !== keyId);
    setAnswerKeys(updated);
    addToast('info', 'Đã xóa mã đề', 'Mã đề đã được gỡ bỏ khỏi hệ thống.');
  };

  // Export current active class gradebook to excel
  const handleExportCurrentGradebook = () => {
    const currentBook = gradebooks[session.className] || {
      className: session.className,
      subjects: [session.subject],
      students: [],
      lastUpdated: new Date().toISOString(),
    };
    exportGradebookToExcel(currentBook, examHistory);
    addToast('success', 'Đang tải file Excel...', `File Excel lớp ${session.className} đã được tạo.`);
  };

  // Available classes and exam codes
  const availableClasses = Object.keys(gradebooks);
  if (!availableClasses.includes(session.className)) {
    availableClasses.unshift(session.className);
  }
  const availableExamCodes = Array.from(new Set(answerKeys.map((k) => k.examCode)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-20 sm:pb-6">
      {/* Toast Notification Container */}
      <SuccessToast toasts={toasts} onDismiss={removeToast} />

      {/* Main Top Header */}
      <Header
        className={session.className}
        setClassName={(cls) => setSession((prev) => ({ ...prev, className: cls }))}
        subject={session.subject}
        setSubject={(sub) => setSession((prev) => ({ ...prev, subject: sub }))}
        examCode={session.examCode}
        setExamCode={(code) => setSession((prev) => ({ ...prev, examCode: code }))}
        availableClasses={availableClasses}
        availableExamCodes={availableExamCodes}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {activeTab === 'scan' && (
          <ScannerView
            className={session.className}
            subject={session.subject}
            examCode={session.examCode}
            onScanComplete={handleScanComplete}
            onRapidSave={handleRapidSave}
            onError={(msg) => addToast('error', 'Lỗi chấm bài', msg)}
          />
        )}

        {activeTab === 'gradebook' && (
          <GradebookView
            gradebooks={gradebooks}
            activeClass={session.className}
            setActiveClass={(cls) => setSession((prev) => ({ ...prev, className: cls }))}
            examHistory={examHistory}
            onUpdateScore={handleUpdateScore}
            onDeleteStudent={handleDeleteStudent}
            onAddStudent={handleAddStudent}
            onAddSubject={handleAddSubject}
          />
        )}

        {activeTab === 'history' && (
          <ExamHistoryView
            history={examHistory}
            onViewDetails={(scan) => setCurrentScanResult(scan)}
            onDeleteScan={handleDeleteScan}
            onExportExcel={handleExportCurrentGradebook}
          />
        )}

        {activeTab === 'keys' && (
          <AnswerKeyManager
            answerKeys={answerKeys}
            onSaveKey={handleSaveKey}
            onDeleteKey={handleDeleteKey}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsAnalyticsView
            gradebooks={gradebooks}
            activeClass={session.className}
            examHistory={examHistory}
          />
        )}
      </main>

      {/* Scan Result Inspection & Adjustment Modal */}
      {currentScanResult && (
        <ScanResultModal
          initialScan={currentScanResult}
          answerKeys={answerKeys}
          onSaveToGradebook={handleSaveToGradebook}
          onClose={() => setCurrentScanResult(null)}
        />
      )}

      {/* Bottom Navigation Bar for Mobile and Quick Switching */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-xs">
        <div className="max-w-xl mx-auto px-2 py-1.5 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'scan'
                ? 'text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[11px]">Chấm bài</span>
          </button>

          <button
            onClick={() => setActiveTab('gradebook')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'gradebook'
                ? 'text-emerald-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[11px]">Bảng điểm</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all relative ${
              activeTab === 'history'
                ? 'text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[11px]">Lịch sử</span>
            {examHistory.length > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {examHistory.length > 99 ? '99+' : examHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'keys'
                ? 'text-amber-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-5 h-5" />
            <span className="text-[11px]">Đáp án</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'reports'
                ? 'text-purple-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[11px]">Báo cáo</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
