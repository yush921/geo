/**
 * wiki.generated.json の写真を縮小して public/photos/ に保存する(Wikimedia への直リンクは
 * 一度に多く読み込むとアクセス制限されるため、アプリに同梱する)。
 *   npm run fetch:images
 * 既に保存済みのファイルはダウンロードしない。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { SPOTS } from '../src/data/jp/spots';

const JSON_PATH = 'src/data/jp/wiki.generated.json';
const DIR = 'public/photos';
const UA = 'chizuneta-data-builder/0.1 (personal study app; https://github.com/yush921/geo)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string): Promise<Buffer> {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    // 長い待ち時間(Retry-After)を指示されたら、今回は飛ばして次回の実行で取り直す
    const wait = Number(res.headers.get('retry-after') ?? 0);
    if (res.status === 429 && wait > 30) throw new Error(`429 (retry-after ${wait}s)`);
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status}`);
    await sleep(5000 * 2 ** i);
  }
  throw new Error('retry exceeded');
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  let saved = 0;
  const failed: string[] = [];
  // アプリで写真を使うのは観光地・遺産・名産品だけ(都市の写真は使わない)
  const used = new Set(Object.values(SPOTS).flatMap((rows) => rows.map((r) => r[3] ?? r[1])));
  const keep = new Set<string>();
  for (const [key, e] of Object.entries<any>(data)) {
    if (!e.image) continue;
    if (!used.has(key)) {
      delete e.image.src;
      continue;
    }
    const name = createHash('sha1').update(e.image.page).digest('hex').slice(0, 12) + '.webp';
    const path = `${DIR}/${name}`;
    if (!existsSync(path)) {
      try {
        const buf = await download(e.image.thumb);
        await sharp(buf).rotate().resize({ width: 560, height: 560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toFile(path);
        saved++;
        if (saved % 20 === 0) console.log(`保存 ${saved}件`);
        await sleep(1200);
      } catch (err) {
        failed.push(`${key}: ${(err as Error).message}`);
        continue;
      }
    }
    e.image.src = `photos/${name}`;
    keep.add(name);
  }
  // 使われなくなった写真を削除
  for (const f of readdirSync(DIR)) if (!keep.has(f)) unlinkSync(`${DIR}/${f}`);
  writeFileSync(JSON_PATH, JSON.stringify(data, null, 1) + '\n');
  console.log(`新規保存 ${saved}件`);
  if (failed.length) console.log('失敗:\n' + failed.join('\n'));
}

main();
