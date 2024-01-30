
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

export type TimerEntryNoteFormProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
};

export type FormData = {
  note: string;
};

export interface Preferences {
  timecamp_api_token: string;
}

export type ActiveTaskItemProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
  setSelectedItemId: (itemId: string) => void;
};
