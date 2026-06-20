export interface Task {
  id: string;
  title: string;
  status: string;
  note: string;
  date: string | null;
  source: 'NOTION' | 'LOCAL';
  area: string | null;
  type: string | null;
  topics: string[];
  url: string;
}

export const VALID_VIEWS = [
  'home',
  'weekly',
  'kanban',
  'calendar',
  'review',
  'notifications',
  'settings',
] as const;

export type ViewType = (typeof VALID_VIEWS)[number];

export const isViewType = (view: string): view is ViewType => {
  return (VALID_VIEWS as readonly string[]).includes(view);
};
