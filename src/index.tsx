import React, { useState, useEffect } from "react";
import { Icon, List, ActionPanel, Action, Detail, Color, Form } from "@raycast/api";

const fetch = require('node-fetch');

type Task = {
  task_id: number | string;
  name: string;
  parent_id: number | string;
  hasChildren?: boolean;
  level: number | string;
  display_name?: string;
  color?: string;
};

function UpdateTimerNote({ task, note }) {
  const updateNote = async (entryId: string | number,noteString: string) => {
    const url = 'https://app.timecamp.com/third_party/api/entries';
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer 1e3472fe62db7491cb0fc20479'
      },
      body: `{"id":${entryId},"note":${noteString}}`
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('Entry Update data: ',data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Note" onSubmit={() => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" defaultValue={note} />
    </Form>
  );
}

function Stage3() {
  return <Detail markdown="# Hello World its me" />;
}

const ActiveTaskItem: React.FC<Task> = ({ task }) => {
  const [timer, setTimer] = useState<string>('00:00:00');

  useEffect(() => {
    const startTimeDate = new Date(task.timer_info.start_time);

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
  }, [task]);

  return (
    <List.Item 
      key={task.task_id}
      icon={{ source: Icon.Stop, tintColor: task.color }} 
      title={task.display_name}
      // subtitle={timer}
      accessories={[
        { icon: {source: Icon.CommandSymbol, tintColor: Color.Red }, tag: {value: " + S", color: Color.Red}},
        { icon: {source: Icon.Clock, tintColor: Color.Green}, text: {value: timer, color: Color.Green} },
      ]} 
      actions={
        <ActionPanel title="#1 in raycast/extensions">
          <Action.Push title="Open This" target={<UpdateTimerNote task={task} />}/>
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
          // console.log(filteredData)
          setTasks(filteredData);
        } catch (error) {
          console.error(error);
        }
      }

      fetchData()
      getActiveTask()
    }
  },[])

  function startTask (task: Task) {
    console.log('starting task',task)
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
        let displayName: string;
        taskFetch.breadcrumb.forEach((crumb: string) => {
          displayName = displayName ? `${displayName} / ${crumb.name}` : crumb.name 
        })
        taskFetch.display_name = displayName;
        taskFetch.timer_info = data;
        console.log('activeTask',taskFetch)
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
            task={activeTask}
          />
        </List.Section>
      ) : null}
      <List.Section title="Tasks">
        {tasks.map((task) => {
          if (activeTask && activeTask.task_id == task.task_id) return null

          return (
            <List.Item 
              key={task.task_id}
              icon={{ source: Icon.Dot, tintColor: task.color }} 
              title={task.display_name}
              subtitle="0,5 Liter" 
              accessories={[{ text: "Germany" }]} 
              actions={
                <ActionPanel title="#1 in raycast/extensions">
                  <Action.Push title="Open This" target={<UpdateTimerNote task={task} />}/>
                </ActionPanel>
              }/>
          )
        })}
      </List.Section>
    </List>
  );
}

