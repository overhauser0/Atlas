export interface PrefectureCell {
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export const JP_PREFS: PrefectureCell[] = [
  { name: '北海道', x: 10, y: 0, w: 2, h: 2 },
  { name: '青森', x: 10, y: 2, w: 2 },
  { name: '秋田', x: 10, y: 3 },
  { name: '岩手', x: 11, y: 3 },
  { name: '山形', x: 10, y: 4 },
  { name: '宮城', x: 11, y: 4 },
  { name: '福島', x: 11, y: 5 },
  { name: '茨城', x: 11, y: 6 },
  { name: '栃木', x: 10, y: 6 },
  { name: '群馬', x: 9, y: 6 },
  { name: '埼玉', x: 10, y: 7 },
  { name: '千葉', x: 11, y: 7, h: 2 },
  { name: '東京', x: 10, y: 8 },
  { name: '神奈川', x: 10, y: 9 },
  { name: '新潟', x: 9, y: 5, w: 2, h: 1 },
  { name: '富山', x: 8, y: 5 },
  { name: '石川', x: 7, y: 4 },
  { name: '福井', x: 7, y: 5 },
  { name: '山梨', x: 9, y: 7 },
  { name: '長野', x: 8, y: 6 },
  { name: '岐阜', x: 8, y: 7 },
  { name: '静岡', x: 9, y: 8 },
  { name: '愛知', x: 8, y: 8 },
  { name: '三重', x: 7, y: 8 },
  { name: '滋賀', x: 7, y: 6, h: 2 },
  { name: '京都', x: 6, y: 6 },
  { name: '大阪', x: 6, y: 7 },
  { name: '兵庫', x: 5, y: 6, h: 2 },
  { name: '奈良', x: 6, y: 8 },
  { name: '和歌山', x: 6, y: 9, w: 2 },
  { name: '鳥取', x: 4, y: 6 },
  { name: '島根', x: 3, y: 6 },
  { name: '岡山', x: 4, y: 7 },
  { name: '広島', x: 3, y: 7 },
  { name: '山口', x: 2, y: 6, h: 2 },
  { name: '徳島', x: 4, y: 9 },
  { name: '香川', x: 4, y: 8 },
  { name: '愛媛', x: 3, y: 8 },
  { name: '高知', x: 3, y: 9 },
  { name: '福岡', x: 1, y: 7 },
  { name: '佐賀', x: 0, y: 8 },
  { name: '長崎', x: 0, y: 7 },
  { name: '熊本', x: 0, y: 9 },
  { name: '大分', x: 1, y: 8 },
  { name: '宮崎', x: 1, y: 9 },
  { name: '鹿児島', x: 0, y: 10, w: 2 },
  { name: '沖縄', x: 4, y: 3 },
];

/** 都道府県名の表記ゆれ（都・府・県）を吸収して正規化する */
export const normalizePref = (prefName: string): string => {
  let p = prefName.replace(/(府|県)$/, '');
  if (p === '東京都') p = '東京';
  if (p === '北海') p = '北海道';
  return p;
};
