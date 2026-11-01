export const ITEM_TAB_PRESETS = [
  'Task',
  'Bucket',
  'Travel',
  'Drinking',
  'Climbing',
  'R-Escape',
  'Golf',
  'Article',
  'Liqueur',
] as const;

export type ItemTabPreset = (typeof ITEM_TAB_PRESETS)[number];

export type Views =
  | 'Home'
  | 'Calendar'
  | 'Photo'
  | 'People'
  | 'Settings'
  | ItemTabPreset;

export interface Person {
  id: string;
  family_name: string;
  given_name: string | null;
  ruby_family_name: string | null;
  ruby_given_name: string | null;
  tags: string[] | null;
  immich_person_id: string | null;
  google_contact_id: string | null;
  birthday: string | null;
  blood_type: string[] | null;
  notes: string | null;
}

export interface PersonPiece {
  id: string;
  notion_piece_id: string | null;
  local_piece_id: string | null;
}

export interface PersonTimelinePiece {
  id: string;
  title: string;
  date: string | null;
  note: string | null;
  source: 'NOTION' | 'LOCAL';
}

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
  prefs: string[];
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
  name: string;
  date: string;
  rate: string | null;
  note: string | null;
}
