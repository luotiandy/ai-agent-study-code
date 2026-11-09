// w2/d3/make-fixtures.ts —— 生成错误恢复演练用的故障文件
// 运行:pnpm start-w2d3-fixtures(仓库根目录)
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("fixtures", { recursive: true });

// 1. 超长文件:约 50KB 文本(read_file 的 40KB 上限会拦截)
const longText = Array.from(
  { length: 800 },
  (_, i) => `第 ${i + 1} 行:这是用于触发 read_file 大小上限的填充文本,内容本身没有信息量。`,
).join("\n");
writeFileSync("fixtures/big.txt", longText, "utf8");

// 2. 损坏文件:二进制乱码(以 utf8 解码后为不可读内容——「语义层失败」的演练素材)
const buf = Buffer.alloc(2048);
for (let i = 0; i < buf.length; i++) buf[i] = (i * 31 + 7) % 256;
writeFileSync("fixtures/broken.bin", buf);

// 3. 空文件(边界:0 字节)
writeFileSync("fixtures/empty.txt", "", "utf8");

console.log("✅ 故障文件已生成于 fixtures/:");
console.log("  big.txt    —", Math.round(Buffer.byteLength(longText) / 1024), "KB 文本(将触发 40KB 上限拦截)");
console.log("  broken.bin — 2KB 二进制乱码(语义层失败素材)");
console.log("  empty.txt  — 空文件(0 字节边界)");
console.log("\n演练结束后可整目录删除:rm -rf fixtures");
