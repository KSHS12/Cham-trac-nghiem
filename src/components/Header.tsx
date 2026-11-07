import React from 'react';
import { FileText, Sparkles, BookOpen, Layers } from 'lucide-react';
import { POPULAR_SUBJECTS } from '../utils/defaultAnswerKeys';

interface HeaderProps {
  className: string;
  setClassName: (cls: string) => void;
  subject: string;
  setSubject: (sub: string) => void;
  examCode: string;
  setExamCode: (code: string) => void;
  availableClasses: string[];
  availableExamCodes: string[];
}

export const Header: React.FC<HeaderProps> = ({
  className,
  setClassName,
  subject,
  setSubject,
  examCode,
  setExamCode,
  availableClasses,
  availableExamCodes,
}) => {
  const [isEditingSetup, setIsEditingSetup] = React.useState(false);
  const [customClass, setCustomClass] = React.useState('');
  const [customSubject, setCustomSubject] = React.useState('');

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top branding bar */}
      <div className="px-4 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white truncate">
                Chấm Thi Trắc Nghiệm 2025
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                QM 2025
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Mẫu phiếu có phách Bộ GD&ĐT (CV 1239)
            </p>
          </div>
        </div>

        {/* View / Download official template button */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/assets/aistudio/MAU_GIAY_KT___NH_K__C__PH_CH_15eb369d.pdf"
            target="_blank"
            rel="noopener noreferrer"
            title="Xem và in mẫu phiếu gốc PDF"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Mẫu phiếu PDF</span>
          </a>

          <button
            onClick={() => setIsEditingSetup(!isEditingSetup)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              isEditingSetup
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {className} • {subject}
            </span>
          </button>
        </div>
      </div>

      {/* Quick context info & Class/Subject configuration drawer */}
      <div className={`border-t border-slate-800/80 bg-slate-950/70 transition-all ${isEditingSetup ? 'block p-4' : 'hidden sm:block px-4 py-2'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400 font-medium">Lớp đang chấm:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setClassName(cls)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    className === cls
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cls}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Lớp mới"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customClass.trim()) {
                      setClassName(customClass.trim().toUpperCase());
                      setCustomClass('');
                    }
                  }}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
                {customClass && (
                  <button
                    onClick={() => {
                      if (customClass.trim()) {
                        setClassName(customClass.trim().toUpperCase());
                        setCustomClass('');
                      }
                    }}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs"
                  >
                    Chọn
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400 font-medium">Môn thi:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POPULAR_SUBJECTS.slice(0, 5).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubject(sub)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    subject === sub
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}

              <select
                value={POPULAR_SUBJECTS.includes(subject) ? subject : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setSubject(e.target.value);
                  }
                }}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>Môn khác...</option>
                {POPULAR_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Môn tự nhập"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customSubject.trim()) {
                      setSubject(customSubject.trim());
                      setCustomSubject('');
                    }
                  }}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
                {customSubject && (
                  <button
                    onClick={() => {
                      if (customSubject.trim()) {
                        setSubject(customSubject.trim());
                        setCustomSubject('');
                      }
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs"
                  >
                    Lưu
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Mã đề:</span>
            <select
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
            >
              {availableExamCodes.map((code) => (
                <option key={code} value={code}>
                  Mã {code}
                </option>
              ))}
              <option value="AUTO">Tự nhận diện</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
