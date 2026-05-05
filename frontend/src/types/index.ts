export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  source: "notion" | "local";
  area: string | null;
  type: string | null;
  topics: string[];
}

export type ViewType = "dashboard" | "settings";
