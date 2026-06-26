export type AppTab = 'Home' | 'Calendar' | 'Bucket' | 'Travel' | 'Explore';

export interface Piece {
  id: string;
  title: string;
  status: string;
  date: string | null;
  area: string | null;
  type: string | null;
  topics: string[];
  flags: string[];
  note: string;
  url: string;
  fkw: string[];
  imageUrl: string;
  source: string;
}

export interface LifeItem {
  id: string;
  title: string;
  status: string;
  date: string | null;
  area: string | null;
  type: string | null;
  topics: string[];
  flags: string[];
  note: string;
  url: string;
  fkw: string[];
  imageUrl: string;
  iconType: string;
  category?: string[];
  source: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
}

export interface DiaryItem {
  id?: string;
  name: string; // yyyy-mm-dd形式
  date: string; // yyyy-mm-dd形式
  rate: string | null;
  note: string | null;
}
