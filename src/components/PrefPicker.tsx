import { AREAS, prefectures } from '../data';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
}

/** 地方ごとにまとめた都道府県のセレクトボックス */
export default function PrefPicker({ value, onChange }: Props) {
  return (
    <select className="pref-picker" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        都道府県を選ぶ
      </option>
      {AREAS.map((a) => (
        <optgroup key={a} label={a}>
          {prefectures
            .filter((p) => p.area === a)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.ja}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
