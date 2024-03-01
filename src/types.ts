export interface TasksResponse {
  [key: string]: Task;
}

export type Task = {
  task_id: number | string;
  name: string;
  parent_id: number | string;
  hasChildren?: boolean;
  level: number | string;
  display_name?: string;
  color?: string;
  timer_info?: TimerInfo;
  breadcrumb?: Crumb[];
  entry?: Entry;
};

export type Crumb = {
  task_id: number | string;
  name: string;
};

export type TimerInfo = {
  isTimerRunning: boolean;
  elapsed: number | string;
  entry_id: number | string;
  timer_id: number | string;
  task_id: number | string;
  start_time: string;
  name: string;
  note: string;
  browser_plugin_button_hash?: string;
};

export type FormData = {
  note: string;
  billable: boolean;
};

export interface Preferences {
  timecamp_api_token: string;
}

export type ActiveTaskItemProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
  setSelectedItemId: (itemId: string) => void;
};

export type Entry = {
  id: number;
  task_id: string;
  task_note: string;
  last_modify: string;
  date: string;
  start_time: string;
  end_time: string;
  name: string;
  color: string;
  description: string;
  project_id?: number;
  project_name?: string;
  breadcrumbs?: string;
  breadcrumps?: string;
  billable?: number | boolean;
};

export type User = {
  user_id: string;
  email: string;
  login_count: string;
  login_time: string;
  display_name: string;
  time_zone: string;
  root_group_id: string;
  summary: string;
  primary_group_id: string;
};
