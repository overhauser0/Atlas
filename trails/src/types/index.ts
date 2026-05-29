export type AppTab = 'Home' | 'Bucket' | 'Travel' | 'Explore' | 'Diary';

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
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
}
