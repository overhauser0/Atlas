export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  source: 'NOTION' | 'LOCAL';
  area: string | null;
  type: string | null;
  topics: string[];
  url: string;
}

export type ViewType =
  | 'dashboard'
  | 'weekly'
  | 'calendar'
  | 'kanban'
  | 'review'
  | 'notifications'
  | 'settings';
