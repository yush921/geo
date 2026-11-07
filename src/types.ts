/**
 * データモデル
 * 世界版でも同じ型を使えるよう、場所は Region の階層で表す。
 *   level: 'country'(国) → 'admin1'(都道府県・州) → 'city'(都市)
 */

export type RegionLevel = 'country' | 'admin1' | 'city';

export interface LocalizedName {
  ja: string;
  en?: string;
  kana?: string;
  local?: string; // 世界版用(現地語表記)
}

export interface Region {
  id: string; // 例: "jp-13"
  level: RegionLevel;
  parentId?: string; // 例: "jp"
  name: LocalizedName;
  /** 地図データ側の ID(TopoJSON の properties.id など) */
  mapCode?: number;
  /** 地方区分(日本版: 北海道/東北/…、世界版: アジア/ヨーロッパ/…) */
  area: string;
  capital?: LocalizedName;
}

/** 都道府県ごとの「この人と話すなら」情報 */
export interface TalkProfile {
  regionId: string;
  meibutsu: string[]; // 名物・名産
  homeru: string[]; // 褒めどころ・地元の人が喜ぶ話
  avoid: string[]; // 避けたい・慎重にしたい話題
}

export type NetaType =
  | '日本一'
  | '由来'
  | 'あるある'
  | '誤解'
  | '歴史'
  | '人物'
  | '旅行'
  | '遺産';

export type Scene = '初対面' | '出張' | '旅行' | '手土産' | '飲み会';

export interface Neta {
  id: string; // 例: "jp-13-1"(並び順で決まるので、既存ネタの途中に挿入せず末尾に追加する)
  targets: string[]; // Region.id(複数可)
  type: NetaType;
  oneLiner: string; // 会話でそのまま使える一言(30字前後)
  detail: string;
  scenes: Scene[];
  /** 統計など年で変わる情報は基準年を入れる。普遍的な話は undefined */
  year?: number;
  source?: string;
  /** 人の目で事実確認済みか(AI 下書きは false) */
  reviewed: boolean;
}
