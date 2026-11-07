/**
 * Wikipedia / Wikimedia Commons から座標・写真・ライセンス情報を取得して
 * src/data/jp/wiki.generated.json に保存する。
 *   npm run fetch:wiki
 * 取得できなかった記事名は最後に一覧表示する(spots.ts / cities.ts の記事名を直す)。
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { SPOTS } from '../src/data/jp/spots';
import { CITIES } from '../src/data/jp/cities';
import { prefectures } from '../src/data';

const OUT = 'src/data/jp/wiki.generated.json';
const UA = 'chizuneta-data-builder/0.1 (personal study app; https://github.com/yush921/geo)';

export interface WikiImage {
  thumb: string;
  page: string;
  license: string;
  artist: string;
}
export interface WikiEntry {
  title: string; // リダイレクト解決後の記事名
  lat?: number;
  lon?: number;
  image?: WikiImage;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH = 20;

async function api(host: string, params: Record<string, string>) {
  // タイトルが多いと URL が長くなりすぎるので POST で送る
  const url = `https://${host}/w/api.php`;
  const body = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  let status = 0;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { method: 'POST', body, headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    status = res.status;
    await sleep(2000 * 2 ** i);
  }
  throw new Error(`API error ${status}: ${host} ${params.titles?.slice(0, 60)}`);
}

/** continue を辿って全ページ分の結果をまとめる(座標などが1回で返り切らないことがある) */
async function queryAll(host: string, params: Record<string, string>) {
  let cont: Record<string, string> = {};
  const merged = new Map<number | string, any>();
  let first: any = null;
  for (;;) {
    const j = await api(host, { ...params, ...cont });
    first ??= j;
    for (const p of j.query?.pages ?? []) {
      const key = p.pageid ?? p.title;
      const cur = merged.get(key);
      if (!cur) merged.set(key, p);
      else for (const [k, v] of Object.entries(p)) if (cur[k] === undefined) cur[k] = v;
    }
    if (!j.continue) break;
    cont = j.continue;
    await sleep(200);
  }
  first.query.pages = [...merged.values()];
  return first;
}

const strip = (html = '') =>
  html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

async function main() {
  const titles = new Set<string>();
  Object.values(SPOTS).forEach((rows) => rows.forEach((r) => titles.add(r[3] ?? r[1])));
  CITIES.forEach((c) => titles.add(c[3] ?? c[1]));
  prefectures.forEach((p) => titles.add(p.capital!.ja.replace(/\(.*\)$/, '')));

  const prev: Record<string, WikiEntry> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const out: Record<string, WikiEntry> = {};
  const missing: string[] = [];
  const list = [...titles];

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const j = await queryAll('ja.wikipedia.org', {
      action: 'query',
      prop: 'coordinates|pageimages|pageprops',
      piprop: 'name',
      ppprop: 'disambiguation',
      colimit: 'max',
      coprimary: 'all',
      pilimit: 'max',
      redirects: '1',
      titles: batch.join('|'),
    });
    const norm = new Map<string, string>();
    for (const n of j.query.normalized ?? []) norm.set(n.from, n.to);
    for (const r of j.query.redirects ?? []) norm.set(norm.get(r.from) ?? r.from, r.to);
    const pages = new Map<string, any>(j.query.pages.map((p: any) => [p.title, p]));
    for (const t of batch) {
      let key = norm.get(t) ?? t;
      key = norm.get(key) ?? key;
      const p = pages.get(key);
      if (!p || p.missing || p.pageprops?.disambiguation !== undefined) {
        missing.push(`${t}${p?.pageprops ? '(曖昧さ回避ページ)' : ''}`);
        continue;
      }
      const c = p.coordinates?.find((x: any) => x.primary) ?? p.coordinates?.[0];
      out[t] = { title: p.title, lat: c?.lat, lon: c?.lon };
      if (p.pageimage) (out[t] as any)._file = p.pageimage;
    }
    await sleep(1500);
  }

  // Commons の画像情報(ライセンス・作者)を取得。Commons にない画像(ローカル画像)は使わない
  const files = [...new Set(Object.values(out).map((e: any) => e._file).filter(Boolean))] as string[];
  const info = new Map<string, WikiImage>();
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const j = await api('commons.wikimedia.org', {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '640',
      iiextmetadatafilter: 'LicenseShortName|Artist|UsageTerms',
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const norm = new Map<string, string>();
    for (const n of j.query.normalized ?? []) norm.set(n.to, n.from);
    for (const p of j.query.pages) {
      const ii = p.imageinfo?.[0];
      if (!ii || p.missing) continue;
      const name = (norm.get(p.title) ?? p.title).replace(/^File:/, '').replace(/^ファイル:/, '');
      const m = ii.extmetadata ?? {};
      info.set(name.replace(/ /g, '_'), {
        thumb: String(ii.thumburl).split('?')[0], // utm_ パラメータを除く
        page: ii.descriptionurl,
        license: strip(m.LicenseShortName?.value) || 'unknown',
        artist: strip(m.Artist?.value) || 'unknown',
      });
    }
    await sleep(1500);
  }

  let withImage = 0;
  for (const [k, e] of Object.entries(out) as [string, any][]) {
    if (e._file) {
      const img = info.get(String(e._file).replace(/ /g, '_'));
      if (img) {
        e.image = img;
        withImage++;
      }
      delete e._file;
    }
    // 前回の取得結果を手で直していた場合に備えて、座標が取れなければ前回値を使う
    if (e.lat === undefined && prev[k]?.lat !== undefined) Object.assign(e, { lat: prev[k].lat, lon: prev[k].lon });
  }

  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b, 'ja')));
  writeFileSync(OUT, JSON.stringify(sorted, null, 1) + '\n');
  const noCoord = Object.entries(out).filter(([, e]) => e.lat === undefined).map(([k]) => k);
  console.log(`取得: ${Object.keys(out).length}/${list.length}件、写真あり ${withImage}件`);
  if (missing.length) console.log('記事が見つからない:', missing.join(', '));
  if (noCoord.length) console.log('座標なし:', noCoord.join(', '));
}

main();
