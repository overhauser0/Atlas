export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  source: 'NOTION' | 'LOCAL';
  area: string | null;
  type: string | null;
  topics: string[];
}

export type ViewMode = 'dashboard' | 'weekly' | 'notifications' | 'settings';
export type ViewType = 'dashboard' | 'weekly' | 'notifications' | 'settings';
