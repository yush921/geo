/** データの簡易チェック: npm run check:data */
import { netas, prefectures, talkById } from '../src/data';

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
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
