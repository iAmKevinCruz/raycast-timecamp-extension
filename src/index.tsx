import React, { useState, useEffect } from "react";
import { useNavigation, Icon, List, ActionPanel, Action, Color, Form } from "@raycast/api";

const fetch = require('node-fetch');

type Task = {
  task_id: number | string;
  name: string;
  parent_id: number | string;
  hasChildren?: boolean;
  level: number | string;
  display_name?: string;
  color?: string;
  timer_info?: TimerInfo;
};

type TimerInfo = {
  isTimerRunning: boolean;
  elapsed: number | string;
  entry_id: number | string;
  timer_id: number | string;
  task_id: number | string;
  start_time: string;
  name: string;
  note: string;
  browser_plugin_button_hash?: string;
}

type TimerEntryNoteFormProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
}

function TimerEntryNoteForm({ activeTask, setActiveTask }: TimerEntryNoteFormProps) {
  const { pop } = useNavigation();
  const updateNote = async (entryId: number | string, noteString: string, close: boolean) => {
    const url = 'https://app.timecamp.com/third_party/api/entries';
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'
      },
      body: `{"id":${parseInt(entryId)},"note":"${noteString}"}`
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (data && data.note == noteString && close) {
        const tempTask = activeTask
        tempTask.timer_info = data;
        setActiveTask(tempTask)
        pop()
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title="Note" 
            onSubmit={(values) => updateNote(activeTask.timer_info.entry_id,values.note,true)} 
          />
        </ActionPanel>
      }
    >
      <Form.TextArea 
        id="note" 
        title="Note"
        autoFocus={true}
        defaultValue={activeTask.timer_info.note}
      />
    </Form>
  );
}

type ActiveTaskItemProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
}
const ActiveTaskItem = ({ activeTask, setActiveTask }: ActiveTaskItemProps) => {
  const [timer, setTimer] = useState<string>('00:00:00');

  useEffect(() => {
    const startTimeDate = new Date(activeTask.timer_info.start_time);

    const interval = setInterval(() => {
      const now = new Date();
      const elapsedTime = now.getTime() - startTimeDate.getTime();

      const seconds = Math.floor((elapsedTime / 1000) % 60);
      const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
      const hours = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24);

      const formattedTime = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
      ].join(':');

      setTimer(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask]);

  async function stopTask (task: Task) {
    console.log('ending task',task)
    const url = 'https://app.timecamp.com/third_party/api/timer';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'
      },
      body: `{"action":"stop","task_id":"${task.task_id}"}`
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('stopped it: ',data);
      if (data.entry_id) {
        setActiveTask(null)
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <List.Item 
      key={activeTask.task_id}
      icon={{ source: Icon.Stop, tintColor: activeTask.color }} 
      title={activeTask.display_name}
      accessories={[
        {
          icon: {source: Icon.CommandSymbol, tintColor: Color.Red },
          tag: {value: " + S", color: Color.Red}
        },
        {
          icon: {source: Icon.Clock, tintColor: Color.Green},
          text: {value: timer, color: Color.Green}
        },
      ]} 
      actions={
        <ActionPanel title="Entry Commands">
          <Action.Push
            title="Open Entry Note" 
            target={
              <TimerEntryNoteForm
                activeTask={activeTask} 
                setActiveTask={setActiveTask}
              />
            }
          />
          <Action 
            title="End Task" 
            onAction={() => stopTask(activeTask)} 
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }/>
  );
};

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    if(tasks.length == 0) {
      const fetchData = async () => {
        const url = "https://app.timecamp.com/third_party/api/tasks?status=active"
        const options = {
          method: 'GET',
          headers: {Accept: 'application/json', Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'}
        };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          const filteredData: Task[] = [];

          // find the last level of every task and build the heirchy in the task.display_name
          const processChildTasks = (parentTaskId: number, displayName: string) => {
            for(const key in data) {
              const task = data[key];
              if (task.name.includes("ARCHIVED")) continue

              if (task.parent_id == parentTaskId) {
                const newDisplayName = displayName ? `${displayName} / ${task.name}` : task.name;
                if (task.hasChildren) {
                  processChildTasks(task.task_id, newDisplayName);
                } else {
                  task.display_name = newDisplayName;
                  filteredData.push(task);
                }
              }
            }
          }

          for (const key in data) {
            const task = data[key];
            if (task.name.includes("ARCHIVED")) continue

            if (task.level == 1) {
              if (task.hasChildren) {
                processChildTasks(task.task_id, task.name);
              } else {
                task.display_name = task.name;
                filteredData.push(task);
              }
            }
          }
          setTasks(filteredData);
        } catch (error) {
          console.error(error);
        }
      }

      fetchData()
      getActiveTask()
    }
  },[activeTask])

  async function startTask (task: Task) {
    console.log('starting task',task)
    const url = 'https://app.timecamp.com/third_party/api/timer';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'
      },
      body: `{"action":"start","task_id":"${task.task_id}"}`
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('Started it: ',data);
      if (data.new_timer_id) {
        getActiveTask()
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function getTasks (taskId: number | string) {
    console.log('getting task', taskId)
    const url = `https://app.timecamp.com/third_party/api/tasks?status=active${taskId ? '&task_id=' + taskId : ''}`
    const options = {
      method: 'GET',
      headers: {Accept: 'application/json', Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'}
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('getTask data',data)
      return data
    } catch (error) {
      console.error(error)
    }
  }

  async function getActiveTask () {
    const url = 'https://app.timecamp.com/third_party/api/timer';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'
      },
      body: '{"action":"status"}'
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log("active timer data: ",data);

      if (data && data.isTimerRunning) {
        const taskFetch = await getTasks(data.task_id);
        type Crumb = {
          task_id: number | string;
          name: string;
        }
        taskFetch.breadcrumb.forEach((crumb: Crumb) => {
          taskFetch.display_name = taskFetch.display_name ? `${taskFetch.display_name} / ${crumb.name}` : crumb.name 
        })
        taskFetch.timer_info = data;
        setActiveTask(taskFetch)
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <List filtering={{keepSectionOrder: true}}>
      {activeTask ? (
        <List.Section title="Active Timer">
          <ActiveTaskItem
            activeTask={activeTask}
            setActiveTask={setActiveTask}
          />
        </List.Section>
      ) : null}
      <List.Section title="Tasks">
        {tasks.map((task: Task) => {
          if (activeTask && activeTask.task_id == task.task_id) return null

          return (
            <List.Item 
              key={task.task_id}
              icon={{ source: Icon.Dot, tintColor: task.color }} 
              title={task.display_name}
              // subtitle="0,5 Liter" 
              // accessories={[{ text: "Germany" }]} 
              actions={
                <ActionPanel title="#1 in raycast/extensions">
                  <Action title="Open This" onAction={() => startTask(task)} />
                </ActionPanel>
              }
            />
          )
        })}
      </List.Section>
    </List>
  );
}

