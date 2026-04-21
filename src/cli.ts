#!/usr/bin/env node
import { ResilientMagika } from "./resilient-magika.js";
import * as fs from "node:fs/promises";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
🚀 Magika Local Scanner (Có Hệ Thống Miễn Dịch)

Sử dụng:
  magika-scan <đường-dẫn-file>

Ví dụ:
  magika-scan "C:\\Users\\LNV\\Desktop\\hinh.jpg"
`);
    process.exit(0);
  }

  const filePath = args[0];

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
       console.error(`❌ Lỗi: '${filePath}' không phải là một tệp hợp lệ.`);
       process.exit(1);
    }
    
    console.log(`⏳ Đang chạy Lõi phân tích AI cho file: ${filePath}`);
    const magika = new ResilientMagika();
    const resultJson = await magika.analyzeFile(filePath);
    
    const resultObj = JSON.parse(resultJson);
    console.log("\n✅ Kết quả Quét:");
    console.log(`- Nhãn loại file: \x1b[32m${resultObj.details.label}\x1b[0m`);
    console.log(`- Đây là văn bản: ${resultObj.details.is_text ? "Có" : "Không"}`);
    if (resultObj.details.score) {
      console.log(`- Độ tự tin: ${(resultObj.details.score * 100).toFixed(2)}%`);
    } else {
      console.log(`- Nguồn nhận dạng: MIME-Type Gốc (Do Lõi AI Fallback)`);
    }
    console.log(`- Trạng thái Lõi: ${resultObj.status === "success" ? "\x1b[32mHoàn hảo\x1b[0m" : "\x1b[33m\x1b[1mĐã Chữa Lành Lỗi (Fallback)\x1b[0m"}`);

  } catch (err: any) {
    console.error(`❌ Lỗi Hệ Thống: ${err.message}`);
    process.exit(1);
  }
}

main();
