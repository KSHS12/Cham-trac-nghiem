import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Zap,
  ZapOff,
  Upload,
  Sparkles,
  Flame,
  CheckCircle2,
  Gauge,
  Smartphone,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { ScanApiResponse, ExamScanResult } from '../types';
import { clientScanExam } from '../utils/clientScanner';

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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio error
  }
}

// Client-side image optimizer: Handles high-resolution camera photos (e.g. 64MP on Samsung A52)
function optimizeImageDataUrl(
  source: HTMLVideoElement | HTMLImageElement,
  maxWidth = 1200,
  quality = 0.82
): string {
  const canvas = document.createElement('canvas');
  let width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  let height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!width || !height) {
    width = 1280;
    height = 720;
  }

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

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Rapid continuous batch mode
  const [isRapidMode, setIsRapidMode] = useState<boolean>(true);
  const [recentGradedBanner, setRecentGradedBanner] = useState<{
    name: string;
    sbd: string;
    score: number;
    time: string;
  } | null>(null);
  const [gradedCount, setGradedCount] = useState<number>(0);

  // Progressive camera stream starter for Live Camera Mode
  const startLiveCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError('Trình duyệt không hỗ trợ WebRTC. Hãy dùng nút "Mở Máy Ảnh" để chụp trực tiếp.');
      return;
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        const rear = videoInputs.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('sau') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
        );
        if (rear && facingMode === 'environment') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: rear.deviceId } },
            audio: false,
          });
        }
      } catch (e) {
        console.warn('DeviceId attempt error:', e);
      }

      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch (e2) {
          console.warn('FacingMode ideal failed:', e2);
        }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (videoRef.current && stream) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
        }

        setIsStreaming(true);

        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.warn('Live camera error:', err);
      setIsStreaming(false);
      onError('Không thể mở camera live. Bạn hãy bấm "Mở Máy Ảnh Chụp Ngay" để chụp bằng camera của điện thoại.');
    }
  };

  const stopLiveCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle Torch for Live stream
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

  // Switch Live Camera
  const switchLiveCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    startLiveCamera();
  };

  // Shutter action for live video frame
  const captureLiveFrame = async () => {
    if (!videoRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Đang tối ưu & nén ảnh...');
      const base64Image = optimizeImageDataUrl(videoRef.current, 1200, 0.82);
      await processScan(base64Image);
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Lỗi khi chụp ảnh');
      setIsProcessing(false);
    }
  };

  // Ultra-fast handling of camera photo from Samsung / Android via URL.createObjectURL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus('Đang xử lý ảnh phiếu thi...');

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const optimizedBase64 = optimizeImageDataUrl(img, 1200, 0.82);
        await processScan(optimizedBase64);
      } catch (err: any) {
        setIsProcessing(false);
        onError('Lỗi nén ảnh phiếu thi');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setIsProcessing(false);
      onError('Không thể mở ảnh bài thi');
    };

    img.src = objectUrl;
    e.target.value = '';
  };

  // Safe Scan Handler: Calls backend AI vision service
  const processScan = async (base64Image: string) => {
    try {
      setProcessingStatus('Đang gửi ảnh phiếu thi đến hệ thống AI...');
      let scanData: ScanApiResponse['data'] | null = null;

      try {
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

        const contentType = response.headers.get('content-type') || '';

        if (response.ok && contentType.includes('application/json')) {
          const resData = await response.json();
          if (resData && resData.success && resData.data) {
            scanData = resData.data;
          } else {
            throw new Error(resData?.error || 'AI không nhận dạng được phiếu thi.');
          }
        } else {
          // Xử lý lỗi trả về từ máy chủ hoặc Vercel
          let errMsg = `Lỗi máy chủ (${response.status})`;
          if (contentType.includes('application/json')) {
            try {
              const errBody = await response.json();
              if (errBody?.error) errMsg = errBody.error;
            } catch (_) {}
          } else if (response.status === 404) {
            errMsg =
              'Không tìm thấy API /api/scan-exam trên máy chủ. Nếu triển khai trên Vercel, vui lòng kiểm tra tệp api/scan-exam.ts và khóa GEMINI_API_KEY.';
          } else {
            const rawText = await response.text().catch(() => '');
            if (rawText.includes('GEMINI_API_KEY')) {
              errMsg = 'Chưa cấu hình GEMINI_API_KEY trên môi trường chạy.';
            }
          }
          throw new Error(errMsg);
        }
      } catch (netErr: any) {
        console.error('API call error:', netErr);
        throw netErr;
      }

      if (!scanData) {
        throw new Error('Không nhận được dữ liệu phân tích từ phiếu thi.');
      }

      // Deliver result according to mode
      if (isRapidMode && onRapidSave) {
        setProcessingStatus('Đang tự động lưu vào bảng điểm...');
        const saved = onRapidSave(scanData, base64Image);
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
        setProcessingStatus('Mở kết quả chi tiết để giáo viên kiểm tra...');
        setTimeout(() => {
          setIsProcessing(false);
          onScanComplete(scanData, base64Image);
        }, 200);
      }
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setIsProcessing(false);
      onError(err.message || 'Lỗi khi xử lý bài thi');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] max-h-[850px] bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Floating Bar: Class/Subject Info & Speed Mode */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">{className}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">{subject}</span>
        </div>

        {/* Speed Mode Switcher */}
        <div className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-full border border-slate-700/80 shadow-lg text-xs">
          <button
            onClick={() => setIsRapidMode(true)}
            className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
              isRapidMode
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Chấm siêu tốc: Tự động lưu và tiếp tục"
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
            title="Soát từng bài: Mở bảng điểm chi tiết"
          >
            <span>Soát bài</span>
          </button>
        </div>
      </div>

      {/* Recent Graded HUD Banner */}
      {recentGradedBanner && (
        <div className="absolute top-16 left-4 right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-950/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white">
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

      {/* Main Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
        {isStreaming ? (
          /* Live WebRTC Stream with Viewfinder */
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Alignment Overlay */}
            <div className="absolute inset-4 sm:inset-8 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg shadow-sm" />
                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[11px] text-white font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Camera Live: Căn 4 góc phiếu QM 2025</span>
                </div>
                <div className="w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg shadow-sm" />
              </div>

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

            {/* Floating button to close Live Camera Mode */}
            <button
              onClick={stopLiveCamera}
              className="absolute bottom-4 left-4 z-20 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl text-xs font-medium border border-white/20 backdrop-blur-md flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Chụp bằng máy ảnh điện thoại</span>
            </button>
          </div>
        ) : (
          /* Primary Clean Camera Mode - No extra instruction cards */
          <div className="flex flex-col items-center justify-center p-5 text-center text-slate-300 max-w-md mx-auto z-10 w-full">
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-500/25">
              <Camera className="w-8 h-8" />
            </div>

            {/* Primary Action Buttons: Real Native HTML Labels */}
            <div className="w-full space-y-2.5">
              {/* BUTTON 1: DIRECT HARDWARE CAMERA VIA NATIVE INTENT */}
              <label
                htmlFor="hardware-camera-btn"
                className="relative block w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-2xl text-sm font-bold text-center shadow-xl shadow-blue-600/35 active:scale-98 transition-all cursor-pointer overflow-hidden border border-blue-400/30"
              >
                <input
                  id="hardware-camera-btn"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 20,
                  }}
                />
                <div className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
                  <Smartphone className="w-5 h-5 text-white" />
                  <span>Mở Máy Ảnh Điện Thoại Chụp Ngay</span>
                </div>
              </label>

              {/* Secondary Options: Live Camera & Gallery */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors shadow-sm"
                >
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span>Bật Camera Live</span>
                </button>

                {/* Pick photo from Gallery */}
                <label
                  htmlFor="gallery-pick-btn"
                  className="relative py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer text-center overflow-hidden"
                >
                  <input
                    id="gallery-pick-btn"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 20,
                    }}
                  />
                  <div className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chọn ảnh có sẵn</span>
                  </div>
                </label>
              </div>

            </div>
          </div>
        )}

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
      <div className="relative z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        {/* Flashlight & Gallery */}
        <div className="flex items-center gap-2">
          {isStreaming && hasTorch && (
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

          {/* Quick gallery icon */}
          <label
            htmlFor="bottom-gallery-input"
            className="relative p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition-colors flex items-center justify-center cursor-pointer overflow-hidden"
            title="Chọn ảnh từ bộ sưu tập"
          >
            <input
              id="bottom-gallery-input"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
            <Upload className="w-5 h-5 pointer-events-none" />
          </label>
        </div>

        {/* Big Center Shutter Button */}
        {isStreaming ? (
          <button
            onClick={captureLiveFrame}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-2xl transition-all transform active:scale-95 ${
              isProcessing
                ? 'opacity-40 cursor-not-allowed bg-slate-700'
                : isRapidMode
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/40 cursor-pointer'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/40 cursor-pointer'
            }`}
            title="Chụp từ luồng trực tiếp"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center pointer-events-none">
              {isRapidMode ? (
                <Flame className="w-6 h-6 text-amber-600" />
              ) : (
                <Camera className="w-6 h-6 text-blue-600" />
              )}
            </div>
          </button>
        ) : (
          <label
            htmlFor="bottom-shutter-input"
            className={`relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-2xl transition-all transform active:scale-95 cursor-pointer overflow-hidden ${
              isProcessing
                ? 'opacity-40 cursor-not-allowed bg-slate-700'
                : isRapidMode
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/40'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/40'
            }`}
            title="Mở máy ảnh chụp ngay"
          >
            <input
              id="bottom-shutter-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 20,
              }}
            />
            <div className="relative z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center pointer-events-none">
              {isRapidMode ? (
                <Flame className="w-6 h-6 text-amber-600" />
              ) : (
                <Smartphone className="w-6 h-6 text-blue-600" />
              )}
            </div>
          </label>
        )}

        {/* Right action buttons */}
        <div className="flex items-center gap-2">
          {isStreaming && (
            <button
              onClick={switchLiveCamera}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition-colors"
              title="Đổi camera trước/sau"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
