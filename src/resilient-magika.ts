import * as fs from "node:fs/promises";
import * as path from "node:path";
import mime from "mime-types";

// Type-only import không crash runtime
import type { MagikaNode } from "magika/node";

export class ResilientMagika {
  private magikaInstance: MagikaNode | null = null;
  private isLoaded: boolean = false;

  constructor() {}

  async ensureLoaded() {
    if (!this.isLoaded || !this.magikaInstance) {
      console.error("[Cơ chế Miễn dịch] Đang nạp lõi AI Magika vào RAM...");
      try {
        const magikaModule = await import("magika/node");
        this.magikaInstance = await magikaModule.MagikaNode.create();
        this.isLoaded = true;
        console.error("[Cơ chế Miễn dịch] Nạp lõi thành công. Sẵn sàng quét!");
      } catch (err) {
        console.error("[Miễn dịch cảnh báo] Khởi tạo Magika thất bại. Model có thể bị hỏng:", err);
        this.isLoaded = false;
        throw err;
      }
    }
  }

  private async reset() {
    console.error("[Cơ chế Miễn dịch] Phát hiện tiến trình treo! Đang Tái sinh (Reset) Lõi AI...");
    this.magikaInstance = null;
    this.isLoaded = false;
    await this.ensureLoaded();
  }

  async analyzeFile(filePath: string): Promise<string> {
    try {
      return await this._attemptAnalysis(filePath);
    } catch (err: any) {
      console.error(`[Cơ chế Miễn dịch] Quét WASM lần 1 gặp sự cố: ${err.message}. Kích hoạt Tái sinh...`);
      try {
        await this.reset();
        return await this._attemptAnalysis(filePath);
      } catch (fatalErr: any) {
        console.error(`[Cơ chế Miễn dịch] Lần 2 vẫn thất bại do lỗi file không tương thích: ${fatalErr.message}. Kích hoạt Lá chắn Dự phòng (Fallback).`);
        return this.fallbackAnalysis(filePath, fatalErr.message);
      }
    }
  }

  private async _attemptAnalysis(filePath: string): Promise<string> {
    await this.ensureLoaded();
    const data = await fs.readFile(filePath);
    const fileBytes = new Uint8Array(data);
    
    // Gọi lõi nhận diện tốc độ cao
    const res = await this.magikaInstance!.identifyBytes(fileBytes);
    
    return JSON.stringify({
      status: "success",
      method: "magika_ai",
      details: {
        path: filePath,
        label: res.prediction.output.label,
        is_text: res.prediction.output.is_text,
        score: res.prediction.score
      }
    }, null, 2);
  }

  private fallbackAnalysis(filePath: string, errorMessage: string): string {
    const ext = path.extname(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";
    return JSON.stringify({
      status: "fallback",
      method: "mime_types_extension",
      error_recovered: errorMessage,
      details: {
        path: filePath,
        label: ext ? ext.substring(1) : "unknown",
        mimeType: mimeType,
      }
    }, null, 2);
  }
}
