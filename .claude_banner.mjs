import sharp from "sharp";
const [dir, picks, out] = process.argv.slice(2);
const list = picks.split(",").map((p) => { const [n, x, y] = p.split(":").map(Number); return { n, x, y }; });
const tiles = [];
for (const [i, { n, x, y }] of list.entries()) {
  const norm = await sharp(`${dir}/hires2/${String(n).padStart(3, "0")}.jpg`).resize(1000, 1500, { fit: "cover" }).toBuffer();
  const buf = await sharp(norm).extract({ left: x, top: y, width: 600, height: 800 }).resize(480, 640).toBuffer();
  tiles.push({ input: buf, left: i * 480, top: 0 });
}
await sharp({ create: { width: 1920, height: 640, channels: 3, background: "#000" } }).composite(tiles).webp({ quality: 88 }).toFile(out);
await sharp(out).jpeg().toFile(out.replace(".webp", "-preview.jpg"));
