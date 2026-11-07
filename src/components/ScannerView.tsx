import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Upload,
  Sparkles,
  Info,
  CheckCircle,
  FileText,
  AlertTriangle,
  PlayCircle,
  Flame,
  CheckCircle2,
  Gauge
} from 'lucide-react';
import { ScanApiResponse, ExamScanResult } from '../types';

interface ScannerViewProps {
  className: string;
  subject: string;
  examCode: string;
  onScanComplete: (result: ScanApiResponse['data'], rawImage: string) => void;
  onRapidSave?: (result: ScanApiResponse['data'], rawImage: string) => ExamScanResult | null;
  onError: (msg: string) => void;
}

// Synthesize short positive audio chime on successful grading
function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio error if browser blocks audio autoplay
  }
}

// Client-side image optimizer: Resizes to max dimension 1200px and compresses to lightweight JPEG
function optimizeImageDataUrl(
  source: HTMLVideoElement | HTMLImageElement,
  maxWidth = 1200,
  quality = 0.8
): string {
  const canvas = document.createElement('canvas');
  let width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  let height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!width || !height) {
    width = 1280;
    height = 720;
  }

  // Downscale proportionally to reduce network payload by 85-90%
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
  }

  return canvas.toDataURL('image/jpeg', quality);
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  className,
  subject,
  examCode,
  onScanComplete,
  onRapidSave,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Rapid continuous batch mode (Tự động lưu, không mở modal từng tờ)
  const [isRapidMode, setIsRapidMode] = useState<boolean>(true);
  const [recentGradedBanner, setRecentGradedBanner] = useState<{
    name: string;
    sbd: string;
    score: number;
    time: string;
  } | null>(null);
  const [gradedCount, setGradedCount] = useState<number>(0);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập máy ảnh trực tiếp. Vui lòng sử dụng tính năng tải ảnh lên.');
      return;
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);

        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setIsStreaming(false);
      setCameraError('Chưa cấp quyền máy ảnh hoặc thiết bị đang được ứng dụng khác sử dụng. Bạn có thể chọn ảnh từ thư viện.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      const newTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch Camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Frame with lightweight optimization
  const captureFrame = async () => {
    if (!videoRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Đang tối ưu & nén ảnh...');

      // Fast client-side resize and compression
      const base64Image = optimizeImageDataUrl(videoRef.current, 1200, 0.82);
      await processScan(base64Image);
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Lỗi khi chụp ảnh');
      setIsProcessing(false);
    }
  };

  // Handle Image Upload with automatic downscaling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawBase64 = event.target?.result as string;
      if (rawBase64) {
        setIsProcessing(true);
        setProcessingStatus('Đang nén ảnh để tải lên nhanh...');

        const img = new Image();
        img.onload = async () => {
          const optimizedBase64 = optimizeImageDataUrl(img, 1200, 0.82);
          await processScan(optimizedBase64);
        };
        img.src = rawBase64;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send to API with minimal latency
  const processScan = async (base64Image: string) => {
    try {
      setProcessingStatus('Máy chủ AI đang phân tích ô tô chì...');
      const response = await fetch('/api/scan-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          expectedClass: className,
          expectedSubject: subject,
          expectedExamCode: examCode === 'AUTO' ? undefined : examCode,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Không thể nhận diện phiếu thi.');
      }

      // Check mode: Rapid Continuous Auto-Save vs Detailed Inspection Modal
      if (isRapidMode && onRapidSave) {
        setProcessingStatus('Đang tự động lưu vào bảng điểm...');
        const saved = onRapidSave(resData.data, base64Image);
        playBeepSound();

        if (saved) {
          setRecentGradedBanner({
            name: saved.studentName,
            sbd: saved.studentSBD,
            score: saved.totalScore,
            time: new Date().toLocaleTimeString('vi-VN'),
          });
          setGradedCount((prev) => prev + 1);
        }

        setTimeout(() => {
          setIsProcessing(false);
        }, 400);
      } else {
        setProcessingStatus('Mở kết quả chi tiết...');
        setTimeout(() => {
          setIsProcessing(false);
          onScanComplete(resData.data, base64Image);
        }, 200);
      }
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setIsProcessing(false);
      onError(err.message || 'Lỗi khi xử lý nhận dạng bài thi.');
    }
  };

  // Demo Scan for testing
  const runDemoScan = () => {
    setIsProcessing(true);
    setProcessingStatus('Đang nạp bài thi mẫu...');
    setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 850;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 600, 850);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('PHIẾU TRẢ LỜI TRẮC NGHIỆM QM 2025 - CV 1239', 50, 40);
          ctx.font = '14px sans-serif';
          ctx.fillText(`Họ và tên: Nguyễn Văn An - Lớp: ${className} - Môn: ${subject}`, 50, 70);
          ctx.fillText(`Mã đề: ${examCode === 'AUTO' ? '101' : examCode} - SBD: 12088`, 50, 95);
          ctx.fillStyle = '#000000';
          ctx.fillRect(20, 20, 20, 20);
          ctx.fillRect(560, 20, 20, 20);
          ctx.fillRect(20, 810, 20, 20);
          ctx.fillRect(560, 810, 20, 20);
        }
        const demoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        await processScan(demoBase64);
      } catch (e: any) {
        setIsProcessing(false);
        onError('Không thể thực hiện chấm mẫu.');
      }
    }, 300);
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] max-h-[850px] bg-black flex flex-col justify-between overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Floating Speed Mode Switcher Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">{className}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">{subject}</span>
        </div>

        {/* Speed Toggle: Rapid Continuous Mode vs Standard Inspect */}
        <div className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-full border border-slate-700/80 shadow-lg text-xs">
          <button
            onClick={() => setIsRapidMode(true)}
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
              isRapidMode
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Chấm liên tục siêu tốc: Tự động lưu không dừng chờ"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Siêu tốc</span>
          </button>

          <button
            onClick={() => setIsRapidMode(false)}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              !isRapidMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Kiểm tra từng bài: Mở pop-up soát câu hỏi"
          >
            <span>Soát bài</span>
          </button>
        </div>
      </div>

      {/* Floating HUD Banner showing recent graded paper in rapid mode */}
      {recentGradedBanner && (
        <div className="absolute top-16 left-4 right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-500/60 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight">{recentGradedBanner.name}</span>
                  <span className="text-[10px] font-mono bg-emerald-900/80 px-1.5 py-0.5 rounded text-emerald-200">
                    SBD: {recentGradedBanner.sbd}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 mt-0.5">
                  <span>Đã lưu vào Bảng điểm Lớp {className}</span>
                  <span>•</span>
                  <span>{recentGradedBanner.time}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black font-mono text-emerald-300">
                {recentGradedBanner.score}
              </div>
              <div className="text-[9px] text-emerald-400 font-semibold uppercase">Điểm / 10</div>
            </div>
          </div>
        </div>
      )}

      {/* Video Element */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
        {isStreaming ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Camera className="w-16 h-16 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300">
              {cameraError || 'Đang mở máy ảnh...'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Bạn có thể tải ảnh chụp phiếu thi từ thư viện hoặc bấm chấm thử bài mẫu.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => startCamera()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Thử lại máy ảnh
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Chọn ảnh từ máy
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder Alignment Overlay matching QM 2025 - CV 1239 */}
        <div className="absolute inset-4 sm:inset-8 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
          {/* 4 Corner Markers */}
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg shadow-sm" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[11px] text-white font-medium">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRapidMode ? 'Chế độ Chấm Siêu Tốc (1-2s/bài)' : 'Khung căn chỉnh phiếu QM 2025'}</span>
            </div>
            <div className="w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg shadow-sm" />
          </div>

          {/* Section Guide Lines */}
          <div className="w-full flex flex-col gap-2 opacity-40">
            <div className="w-full border-b border-dashed border-white/60 flex justify-between text-[10px] text-white/80 pb-0.5">
              <span>Mục 1-8: Thông tin thí sinh & Mã đề</span>
              <span>Đường rọc phách ✂</span>
            </div>
            <div className="w-full h-24 border border-dashed border-blue-400/50 rounded flex items-center justify-center text-[10px] text-blue-200">
              PHẦN I: 40 câu trắc nghiệm (A, B, C, D)
            </div>
            <div className="w-full h-16 border border-dashed border-emerald-400/50 rounded flex items-center justify-center text-[10px] text-emerald-200">
              PHẦN II: 8 câu Đúng/Sai & PHẦN III: 6 câu số
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg shadow-sm" />
            <div className="text-[11px] text-white/90 text-center font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
              {gradedCount > 0 ? `Đã chấm ${gradedCount} bài • Tiếp tục lật bài mới` : 'Căn thẳng giấy và đủ ánh sáng'}
            </div>
            <div className="w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg shadow-sm" />
          </div>
        </div>

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white tracking-wide">
              {isRapidMode ? 'Đang chấm siêu tốc...' : 'Đang xử lý phiếu thi...'}
            </h3>
            <p className="mt-1 text-sm text-slate-300 max-w-xs">
              {processingStatus}
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="relative z-30 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        {/* Flashlight button */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-3 rounded-full transition-colors ${
                torchOn
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Bật/Tắt đèn Flash"
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition-colors flex items-center justify-center"
            title="Tải ảnh phiếu thi từ điện thoại"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>

        {/* Big Shutter Button */}
        <button
          onClick={captureFrame}
          disabled={isProcessing || !isStreaming}
          className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-2xl transition-all transform active:scale-95 ${
            isProcessing || !isStreaming
              ? 'opacity-40 cursor-not-allowed bg-slate-700'
              : isRapidMode
              ? 'bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/40 cursor-pointer'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/40 cursor-pointer'
          }`}
          title={isRapidMode ? 'Chụp và Tự Động Lưu Siêu Tốc' : 'Chụp và Xem Kết Quả'}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            {isRapidMode ? (
              <Flame className="w-6 h-6 text-amber-600" />
            ) : (
              <Camera className="w-6 h-6 text-blue-600" />
            )}
          </div>
        </button>

        {/* Right action buttons: Switch Camera & Demo Scan */}
        <div className="flex items-center gap-2">
          <button
            onClick={switchCamera}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition-colors"
            title="Đổi camera trước/sau"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={runDemoScan}
            disabled={isProcessing}
            className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            title="Chấm thử bài mẫu để trải nghiệm ngay"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Chấm bài mẫu</span>
            <span className="sm:hidden">Mẫu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
