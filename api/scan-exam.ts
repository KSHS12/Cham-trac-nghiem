import type { Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export default async function handler(req: Request, res: Response) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', expectedClass, expectedSubject, expectedExamCode } = req.body || {};

    if (!imageBase64) {
      res.status(400).json({ success: false, error: 'Thiếu dữ liệu hình ảnh' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường chạy Vercel. Vui lòng cấu hình biến môi trường GEMINI_API_KEY.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `Bạn là hệ thống thị giác máy tính chuyên phân tích phiếu trả lời trắc nghiệm chuẩn Bộ GD&ĐT Việt Nam năm 2025 (Mẫu QM 2025 - CV 1239 có phách).
YÊU CẦU ĐỘC LẬP VÀ CHÍNH XÁC TUYỆT ĐỐI TỪ ẢNH CHỤP:
1. ĐỌC THÔNG TIN THÍ SINH (TRÊN HÌNH ẢNH THẬT):
   - "Họ và tên thí sinh": Đọc đúng chữ viết tay của học sinh ghi sau dòng "2. Họ và tên thí sinh:". Nếu học sinh không ghi hoặc để trống, trả về chuỗi rỗng "". TUYỆT ĐỐI KHÔNG TỰ BỊA TÊN.
   - "Số báo danh": Đọc các chữ số học sinh ghi sau dòng "3. Số báo danh:". Nếu không ghi hoặc để trống, trả về chuỗi rỗng "". TUYỆT ĐỐI KHÔNG TỰ BỊA SỐ BÁO DANH.
   - "Lớp": Đọc chữ viết tay tại dòng "4. Lớp:". Nếu không ghi, trả về chuỗi rỗng "".
   - "MÔN THI": Đọc chữ viết tay tại dòng "MÔN THI:". Nếu không ghi, trả về chuỗi rỗng "".
   - "Mã đề thi": TỰ ĐỘNG DÒ MÃ ĐỀ: Đọc các số viết tay trong 4 ô vuông tại "Mã đề thi" VÀ đọc các ô tròn tô đen ở mục "8. Mã đề thi" bên phải (ví dụ: "101", "102", "1101", "201", "1234"). Trả về đúng mã đề đọc được trên phiếu.

2. ĐỌC ĐÁP ÁN CÁC Ô TÔ CHÌ:
   - PHẦN I (Trắc nghiệm 4 lựa chọn, Câu 1 đến 40): Đọc ô tròn tô đen ở mỗi câu (A, B, C, D). Nếu câu nào không tô, tẩy trắng hoặc không có thì trả về null.
   - PHẦN II (Đúng/Sai, Câu 1 đến 8, mỗi câu có 4 ý a, b, c, d): Trả về true nếu tô cột "Đúng", false nếu tô cột "Sai", null nếu không tô.
   - PHẦN III (Điền số, Câu 1 đến 6): Đọc các cột số được tô dấu âm '-', dấu thập phân ',', và các chữ số 0-9 để tạo thành chuỗi số kết quả (ví dụ: "-3.5", "12", "0.25"). Trả về null nếu câu đó không tô.`;

    const promptText = `Hãy quét phiếu thi trắc nghiệm này và trích xuất dữ liệu thí sinh cùng tất cả các câu trả lời ở Phần I (1-40), Phần II (1-8 a,b,c,d), và Phần III (1-6).
Gợi ý tham khảo:
- Lớp dự kiến: ${expectedClass || 'Chưa rõ'}
- Môn dự kiến: ${expectedSubject || 'Chưa rõ'}
- Mã đề dự kiến: ${expectedExamCode || 'Chưa rõ'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING, description: 'Họ và tên thí sinh viết tay trên phiếu, chuỗi rỗng nếu không ghi' },
            studentSBD: { type: Type.STRING, description: 'Số báo danh viết tay trên phiếu, chuỗi rỗng nếu không ghi' },
            className: { type: Type.STRING, description: 'Lớp viết tay trên phiếu, chuỗi rỗng nếu không ghi' },
            subject: { type: Type.STRING, description: 'Môn thi viết tay trên phiếu, chuỗi rỗng nếu không ghi' },
            examCode: { type: Type.STRING, description: 'Mã đề thi tự động dò từ ô mã đề thi hoặc phần 8 tô mã đề' },
            part1: {
              type: Type.OBJECT,
              properties: Array.from({ length: 40 }, (_, i) => String(i + 1)).reduce((acc: any, q) => {
                acc[q] = { type: Type.STRING, nullable: true };
                return acc;
              }, {}),
            },
            part2: {
              type: Type.OBJECT,
              properties: Array.from({ length: 8 }, (_, i) => String(i + 1)).reduce((acc: any, q) => {
                acc[q] = {
                  type: Type.OBJECT,
                  properties: {
                    a: { type: Type.BOOLEAN, nullable: true },
                    b: { type: Type.BOOLEAN, nullable: true },
                    c: { type: Type.BOOLEAN, nullable: true },
                    d: { type: Type.BOOLEAN, nullable: true },
                  },
                };
                return acc;
              }, {}),
            },
            part3: {
              type: Type.OBJECT,
              properties: Array.from({ length: 6 }, (_, i) => String(i + 1)).reduce((acc: any, q) => {
                acc[q] = { type: Type.STRING, nullable: true };
                return acc;
              }, {}),
            },
            confidence: { type: Type.NUMBER },
          },
          required: ['studentName', 'studentSBD', 'examCode', 'part1', 'part2', 'part3'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    const part1Num: Record<number, any> = {};
    for (let i = 1; i <= 40; i++) {
      part1Num[i] = parsed.part1?.[String(i)] ?? parsed.part1?.[i] ?? null;
    }

    const part2Num: Record<number, any> = {};
    for (let i = 1; i <= 8; i++) {
      const q = parsed.part2?.[String(i)] ?? parsed.part2?.[i] ?? {};
      part2Num[i] = {
        a: typeof q.a === 'boolean' ? q.a : null,
        b: typeof q.b === 'boolean' ? q.b : null,
        c: typeof q.c === 'boolean' ? q.c : null,
        d: typeof q.d === 'boolean' ? q.d : null,
      };
    }

    const part3Num: Record<number, any> = {};
    for (let i = 1; i <= 6; i++) {
      part3Num[i] = parsed.part3?.[String(i)] ?? parsed.part3?.[i] ?? null;
    }

    res.status(200).json({
      success: true,
      data: {
        studentName: (parsed.studentName || '').trim(),
        studentSBD: (parsed.studentSBD || '').trim(),
        className: (parsed.className || '').trim(),
        subject: (parsed.subject || '').trim(),
        examCode: (parsed.examCode || '').trim() || (expectedExamCode && expectedExamCode !== 'AUTO' ? expectedExamCode : ''),
        part1: part1Num,
        part2: part2Num,
        part3: part3Num,
        confidence: parsed.confidence || 0.95,
        detectedOnPaper: {
          name: (parsed.studentName || '').trim(),
          sbd: (parsed.studentSBD || '').trim(),
          className: (parsed.className || '').trim(),
          subject: (parsed.subject || '').trim(),
          examCode: (parsed.examCode || '').trim(),
        },
      },
    });
  } catch (error: any) {
    console.error('API scan-exam error:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi xử lý phiếu thi' });
  }
}
