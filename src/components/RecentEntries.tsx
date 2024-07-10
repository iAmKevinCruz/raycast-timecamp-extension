import React, { useEffect, useState } from "react";
import {
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
  Icon,
  List,
  ActionPanel,
  Action,
  Color
} from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";
import type { Task, Preferences, TimerInfo, Entry, User } from "../types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

function RecentEntries() {
  const [tasks] = useCachedState<Task[]>("tasks", []);
  const [, setActiveTask] = useCachedState<Task | null>("activeTask", null);
  const [recentEntries, setRecentEntries] = useCachedState<Entry[]>("recentEntries", []);
  const [dropdownFilter] = useCachedState<string>("dropdownFilter", "all");
  const [user, setUser] = useCachedState<User | null>("user", null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [postClose, setPostClose] = useState(false);
  const { mutate: mutateRecentEntries } = useFetch(
    `https://app.timecamp.com/third_party/api/entries?from=${getDateWindow().startDate}&to=${getDateWindow().endDate}&opt_fields=breadcrumps&include_project=true&user_ids=${user ? user.user_id : null}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      execute: false,
      initialData: recentEntries,
      onData: initRecentEntries,
    },
  );
  const { mutate: mutateUser } = useFetch(
    "https://app.timecamp.com/third_party/api/user/%22%22",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      execute: false,
      onData: setUser,
    }
  );
  const { mutate: mutateTimer } = useFetch("https://app.timecamp.com/third_party/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: '{"action":"status"}',
    execute: false,
    onData: updateNote,
  });
  const { mutate: mutateEntry } = useFetch("https://app.timecamp.com/third_party/api/entries", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    execute: false,
  });

  useEffect(() => {
    async function getUser() {
      try {
        await mutateUser();
      } catch (err) {
        console.error("error getting user: ", err);
        await showToast({
          style: Toast.Style.Failure,
          title: "❌ Error getting user",
        });
      }
    }
    async function getRecentEntries() {
      try {
        await mutateRecentEntries();
      } catch (err) {
        console.error("error getting entries: ", err);
        await showToast({
          style: Toast.Style.Failure,
          title: "❌ Error getting entries",
        });
      }
    }

    if (!user) {
      getUser();
    } else {
      getRecentEntries();
    }
  }, [dropdownFilter]);

  async function updateNote(data: TimerInfo) {
    try {
      await mutateEntry(
        fetch("https://app.timecamp.com/third_party/api/entries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: data.entry_id,
            note: selectedEntry ? selectedEntry.description : "",
            billable: selectedEntry ? selectedEntry.billable : 1,
          }),
        }),
        {
          async optimisticUpdate() {
            const tempTask: Task | undefined = tasks.find((task: Task) => task.task_id == data.task_id);
            if (tempTask) {
              tempTask.timer_info = data;
              tempTask.timer_info.note = selectedEntry ? selectedEntry.description : "";

              if (selectedEntry) {
                tempTask.entry = selectedEntry;
              }

              setActiveTask(tempTask);
            }

            if (postClose) {
              await showHUD("✅ Entry Resumed", { clearRootSearch: true });
            } else {
              await showToast({
                style: Toast.Style.Success,
                title: "✅ Entry Resumed",
              });
            }

            setSelectedEntry(null);
            setPostClose(false);
          },
          rollbackOnError: true,
          shouldRevalidateAfter: false,
        },
      );
    } catch (err) {
      console.error("error updating task: ", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error saving the entry",
      });
    }
  }

  async function startTimer(entry: Entry, close: boolean) {
    setSelectedEntry(entry);
    setPostClose(close);
    try {
      await mutateTimer(
        fetch("https://app.timecamp.com/third_party/api/timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "start", task_id: entry.task_id }),
        }),
        {
          shouldRevalidateAfter: true,
        },
      );
      await showToast({
        style: Toast.Style.Success,
        title: "⏳ Task Started",
      });
    } catch (err) {
      console.error("error starting task: ", err);
      setSelectedEntry(null);
      setPostClose(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error starting task",
      });
    }
  }

  function initRecentEntries(data: Entry[]) {
    data.reverse();
    const curatedData: Entry[] = [];
    for (let i = 0; i < data.length; i++) {
      const entry: Entry = data[i];
      if (
        !curatedData.find((item: Entry) => item.description === entry.description && item.task_id === entry.task_id) &&
        entry.description
      ) {
        curatedData.push(entry);
      }

      if (dropdownFilter === "all" && curatedData.length >= 5) break;
    }
    setRecentEntries(curatedData);
  }

  function getDateWindow() {
    const endDate = new Date();
    const startDate = new Date();

    // Set start date to 30 days before
    startDate.setDate(startDate.getDate() - 30);

    // Format dates to YYYY-MM-DD
    const format = (date: Date) => date.toISOString().split("T")[0];

    return {
      startDate: format(startDate),
      endDate: format(endDate),
    };
  }

  return recentEntries.length > 0 ? (
    <List.Section title="Recent">
      {(recentEntries || []).map((entry: Entry) => {
        const title: string = entry.breadcrumps ? `${entry.breadcrumps} / ${entry.name}` : entry.name;
        const subtitle: string = entry.description;

        const keywordsBillable = ["billable", "bill"];
        const keywordsNonBillable = ["non-billable", "non-bill"];

        const keywords = entry.description ? entry.description.split(" ") : [];
        if (entry.billable) {
          keywords.push(...keywordsBillable);
        } else {
          keywords.push(...keywordsNonBillable);
        }

        return (
          <List.Item
            key={"entry-" + entry.id}
            id={"entry-" + entry.id.toString()}
            icon={{ source: Icon.Dot, tintColor: entry.color }}
            title={title}
            subtitle={subtitle}
            keywords={keywords}
            accessories={[
              entry.billable
                ? {
                    icon: { source: Icon.Wallet, tintColor: Color.Green },
                  }
                : {},
            ]}
            actions={
              <ActionPanel title="Recent Entries">
                <Action title="Resume Task & Close Window" onAction={() => startTimer(entry, true)} />
                <Action
                  title="Resume Task"
                  onAction={() => startTimer(entry, false)}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  ) : null;
}

export default RecentEntries;
