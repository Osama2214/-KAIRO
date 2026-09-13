// Copies every object from the current R2 bucket (R2_*) to the new one
// (NEW_R2_*), keeping keys, content type and cache headers, so an image URL
// only needs its base swapped. The source bucket is only read. Safe to rerun:
// objects already present with the same size are skipped.
//
//   node scripts/migrate-media.mjs
import { readFileSync } from "node:fs";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "NEW_R2_ACCOUNT_ID", "NEW_R2_ACCESS_KEY_ID", "NEW_R2_SECRET_ACCESS_KEY", "NEW_R2_BUCKET", "NEW_R2_PUBLIC_URL"];
const missing = need.filter((k) => !env[k]);
if (missing.length) throw new Error(`missing ${missing.join(", ")}`);

const client = (p) =>
  new S3Client({
    region: "auto",
    endpoint: `https://${env[`${p}R2_ACCOUNT_ID`]}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env[`${p}R2_ACCESS_KEY_ID`], secretAccessKey: env[`${p}R2_SECRET_ACCESS_KEY`] },
  });
const src = client("");
const dst = client("NEW_");

async function listAll(s3, Bucket) {
  const out = new Map();
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
    for (const o of page.Contents || []) out.set(o.Key, o.Size);
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return out;
}

const source = await listAll(src, env.R2_BUCKET);
const target = await listAll(dst, env.NEW_R2_BUCKET);
const todo = [...source].filter(([key, size]) => target.get(key) !== size);
console.log(`source ${source.size} objects, target ${target.size}, to copy ${todo.length}`);

let done = 0;
let failed = [];
async function copy([Key]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const obj = await src.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key }));
      const Body = Buffer.from(await obj.Body.transformToByteArray());
      await dst.send(new PutObjectCommand({
        Bucket: env.NEW_R2_BUCKET, Key, Body,
        ContentType: obj.ContentType,
        CacheControl: obj.CacheControl || "public, max-age=31536000, immutable",
      }));
      if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`);
      return;
    } catch (e) {
      if (attempt === 3) failed.push(`${Key}: ${e.message}`);
    }
  }
}
const queue = [...todo];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await copy(queue.shift()); }));

// Verify: every source key exists with the same size, and a sample is public.
const after = await listAll(dst, env.NEW_R2_BUCKET);
const wrong = [...source].filter(([key, size]) => after.get(key) !== size).map(([key]) => key);
const base = env.NEW_R2_PUBLIC_URL.replace(/\/+$/, "");
const sample = [...source.keys()].filter((_, i) => i % Math.max(1, Math.floor(source.size / 5)) === 0).slice(0, 5);
const probes = await Promise.all(sample.map(async (key) => [key, (await fetch(`${base}/${key}`, { method: "HEAD" })).status]));

console.log(`copied ${done}, failed ${failed.length}`);
failed.forEach((f) => console.log("  FAIL", f));
console.log(`target now ${after.size} objects; mismatched ${wrong.length}`);
probes.forEach(([key, status]) => console.log(`  public ${status} ${key}`));
const ok = !failed.length && !wrong.length && probes.every(([, s]) => s === 200);
console.log(ok ? "MEDIA COPY OK" : "MEDIA COPY HAS PROBLEMS");
process.exit(ok ? 0 : 1);
