export type TaskStatus =
  | 'INBOX'
  | 'Waiting'
  | 'Going'
  | 'Done'
  | 'Wrapper'
  | 'Canceled';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  note: string;
  date: string | null;
  source: 'NOTION' | 'LOCAL';
  area: string | null;
  type: string | null;
  topics: string[];
  url: string;
  fkw: string[];
  parent_id?: string | null;
}

export const VALID_VIEWS = [
  'home',
  'weekly',
  'kanban',
  'calendar',
  'meeting',
  'review',
  'notifications',
  'note',
  'aiagent',
  'stats',
  'settings',
] as const;

export type ViewType = (typeof VALID_VIEWS)[number];

export const isViewType = (view: string): view is ViewType => {
  return (VALID_VIEWS as readonly string[]).includes(view);
};

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  clientType: 'extension' | 'gleis' | string;
}
