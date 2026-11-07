/**
 * 地図にピン表示する都市
 * 県庁所在地は prefectures から自動で追加されるので、ここにはそれ以外の主要都市を書く。
 * [都道府県コード, 都市名, 種別, Wikipedia の記事名(都市名と違う場合のみ)]
 * 座標は `npm run fetch:wiki` で取得する。
 */
export type CityKind = 'capital' | 'designated' | 'major';
type Row = [number, string, Exclude<CityKind, 'capital'>, string?];

export const CITIES: Row[] = [
  // 政令指定都市(県庁所在地以外)
  [14, '川崎市', 'designated'],
  [14, '相模原市', 'designated'],
  [22, '浜松市', 'designated'],
  [27, '堺市', 'designated'],
  [40, '北九州市', 'designated'],
  // その他の主要都市
  [1, '函館市', 'major'],
  [1, '旭川市', 'major'],
  [1, '釧路市', 'major'],
  [2, '弘前市', 'major'],
  [2, '八戸市', 'major'],
  [7, '郡山市', 'major'],
  [7, 'いわき市', 'major'],
  [7, '会津若松市', 'major'],
  [8, 'つくば市', 'major'],
  [10, '高崎市', 'major'],
  [11, '川越市', 'major'],
  [12, '船橋市', 'major'],
  [13, '八王子市', 'major'],
  [14, '鎌倉市', 'major'],
  [15, '長岡市', 'major'],
  [17, '輪島市', 'major'],
  [20, '松本市', 'major'],
  [21, '高山市', 'major'],
  [23, '豊田市', 'major'],
  [24, '四日市市', 'major'],
  [24, '伊勢市', 'major'],
  [28, '姫路市', 'major'],
  [30, '白浜町', 'major'],
  [31, '米子市', 'major'],
  [32, '出雲市', 'major'],
  [33, '倉敷市', 'major'],
  [34, '福山市', 'major'],
  [34, '尾道市', 'major'],
  [35, '下関市', 'major'],
  [38, '今治市', 'major'],
  [40, '久留米市', 'major'],
  [42, '佐世保市', 'major'],
  [44, '別府市', 'major'],
  [45, '延岡市', 'major'],
  [46, '霧島市', 'major'],
  [47, '石垣市', 'major'],
];
