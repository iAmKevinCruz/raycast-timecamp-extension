import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Entry, Task, TimerInfo } from "./types";
import { useState } from "react";
import { getEllapsedTime } from "./utils";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

export default function Command() {
  const [tasks, setTasks] = useCachedState<Task[]>("tasks", []);
  const [recentEntries] = useCachedState<Entry[]>("recentEntries", []);
  const [timer, setTimer] = useCachedState<string>("menuBarTimer", "00:00:00");
  const [activeTask, setActiveTask] = useCachedState<Task | null>("activeTask", null);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useCachedState("visible", true);
  const { data } = useFetch("https://app.timecamp.com/third_party/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: '{"action":"status"}',
    keepPreviousData: true,
    initialData: activeTask,
    onData: (data:TimerInfo) => getActiveTask({
      data,
      setActiveTask,
      tasks,
      recentEntries,
    }),
  });

  function getActiveTask({
    data,
    setActiveTask,
    tasks,
    recentEntries,
  }: {
      data: TimerInfo,
      setActiveTask: (task: Task | null) => void,
      tasks: Task[],
      recentEntries: Entry[]
    }) {
    if (data) {
      if (data.isTimerRunning) {
        const findTask = tasks.find((task: Task) => task.task_id == data.task_id);
        const findEntry = recentEntries.find((entry: Entry) => entry.id == data.entry_id);
        if (findTask) {
          findTask.timer_info = data;

          if (findEntry) {
            findTask.entry = findEntry;
          }
          const formattedTime = getEllapsedTime({ activeTask: findTask, context: "menubar" });

          setActiveTask(findTask);
          setTimer(formattedTime);
          setIsLoading(false);
        }
      } else if (!data.isTimerRunning) {
        setActiveTask(null);
        setTimer("");
        setIsLoading(false);
      }
    }
  }

  return (
    <MenuBarExtra 
      isLoading={isLoading} 
      {...(activeTask ? {icon: Icon.Clock} : {})}
      title={visible ? timer : ""} 
      tooltip={activeTask?.display_name} 
    >
      <MenuBarExtra.Item 
        title="Toggle Visibility" 
        onAction={() => setVisible(!visible)}
      />
    </MenuBarExtra>
  );
}
