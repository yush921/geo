import { netas, prefectures, talkById } from '../src/data';
import { spots, cities } from '../src/data/places';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import topo from '../src/data/jp/japan.topo.json';
import { regionByMapCode } from '../src/data';
/** データの簡易チェック: npm run check:data */

const errors: string[] = [];
if (prefectures.length !== 47) errors.push(`都道府県が${prefectures.length}件しかありません`);
const ids = new Set<string>();
for (const n of netas) {
  if (ids.has(n.id)) errors.push(`ID重複: ${n.id}`);
  ids.add(n.id);
  if (n.oneLiner.length > 40) console.warn(`一言が長め(${n.oneLiner.length}字): ${n.id} ${n.oneLiner}`);
}
for (const p of prefectures) {
  const c = netas.filter((n) => n.targets.includes(p.id)).length;
  if (c < 5) errors.push(`${p.name.ja}: ネタが${c}件`);
  if (!talkById.get(p.id)?.homeru.length) errors.push(`${p.name.ja}: 褒めどころがありません`);
}
const unreviewed = netas.filter((n) => !n.reviewed).length;
console.log(`都道府県 ${prefectures.length} / ネタ ${netas.length}(未確認 ${unreviewed})`);

// 観光地・遺産・都市の座標が、別の都道府県の中に入っていないかを確認する(記事名の取り違えを見つける)

const fc = feature(topo as any, (topo as any).objects.japan) as any;
const whichPref = (lon: number, lat: number) => {
  const f = fc.features.find((f: any) => geoContains(f, [lon, lat]));
  return f ? regionByMapCode.get(f.properties.id)?.id : undefined;
};
const places = [
  ...spots.filter((s) => s.lat !== undefined).map((s) => ({ name: s.name, regionId: s.regionId, lat: s.lat!, lon: s.lon! })),
  ...cities.map((c) => ({ name: c.name, regionId: c.regionId, lat: c.lat, lon: c.lon })),
];
for (const p of places) {
  const r = whichPref(p.lon, p.lat);
  if (r && r !== p.regionId) errors.push(`${p.name}: 座標が${r}の中にあります(本来は${p.regionId})`);
}
const noPin = spots.filter((s) => s.category !== '名産' && s.lat === undefined).map((s) => s.name);
const noImg = spots.filter((s) => !s.image).map((s) => s.name);
console.log(`観光・遺産・名産 ${spots.length}(写真なし ${noImg.length}: ${noImg.join('、')}) / 都市 ${cities.length}`);
if (noPin.length) console.warn('座標がない観光地・遺産:', noPin.join('、'));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
