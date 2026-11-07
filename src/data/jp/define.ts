import type { Neta, NetaType, Region, Scene, TalkProfile } from '../../types';

export interface NetaInput {
  type: NetaType;
  one: string;
  detail: string;
  scenes: Scene[];
  year?: number;
  source?: string;
  reviewed?: boolean;
}

export interface PrefInput {
  code: number; // JIS 都道府県コード(1〜47)
  ja: string;
  en: string;
  kana: string;
  capital: [ja: string, kana: string];
  area: string;
  meibutsu: string[];
  homeru: string[];
  avoid?: string[];
  neta: NetaInput[];
}

export interface PrefBundle {
  region: Region;
  talk: TalkProfile;
  neta: Neta[];
}

export const prefId = (code: number) => `jp-${String(code).padStart(2, '0')}`;

/** 都道府県1つ分の入力をアプリ内部の型に展開する */
export function pref(p: PrefInput): PrefBundle {
  const id = prefId(p.code);
  return {
    region: {
      id,
      level: 'admin1',
      parentId: 'jp',
      name: { ja: p.ja, en: p.en, kana: p.kana },
      mapCode: p.code,
      area: p.area,
      capital: { ja: p.capital[0], kana: p.capital[1] },
    },
    talk: { regionId: id, meibutsu: p.meibutsu, homeru: p.homeru, avoid: p.avoid ?? [] },
    neta: p.neta.map((n, i) => ({
      id: `${id}-${i + 1}`,
      targets: [id],
      type: n.type,
      oneLiner: n.one,
      detail: n.detail,
      scenes: n.scenes,
      year: n.year,
      source: n.source,
      reviewed: n.reviewed ?? false,
    })),
  };
}
