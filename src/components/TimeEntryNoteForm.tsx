import React, { useState, useEffect } from "react";
import {
  useNavigation,
  getPreferenceValues,
  closeMainWindow,
  ActionPanel,
  Action,
  Form,
} from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";
import type { FormData, TimerEntryNoteFormProps, Preferences } from "../types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

function TimerEntryNoteForm({ activeTask, setActiveTask }: TimerEntryNoteFormProps) {
  const { mutate } = useFetch("https://app.timecamp.com/third_party/api/entries", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    execute: false,
  });
  const { pop } = useNavigation();

  const updateNote = async (entryId: number | string, noteString: string, close: boolean) => {
    try {
      await mutate(
        fetch("https://app.timecamp.com/third_party/api/entries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: entryId, note: noteString }),
        }),
        {
          async optimisticUpdate() {
            const tempTask = activeTask;
            if (tempTask.timer_info) {
              tempTask.timer_info.note = noteString;
            }
            setActiveTask(tempTask);
            pop();
            if (close) {
              await closeMainWindow({ clearRootSearch: true });
            }
          },
          rollbackOnError: true,
          shouldRevalidateAfter: false,
        },
      );
    } catch (err) {
      console.error("error updating task: ", err);
    }
  };

  return (
    <Form
      navigationTitle="Edit Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Edits & Close Window"
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values.note, true)
            }
          />
          <Action.SubmitForm
            title="Save Edits"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values.note, false)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="note"
        title="Note"
        placeholder="Enter task note"
        autoFocus={true}
        defaultValue={activeTask.timer_info?.note}
      />
    </Form>
  );
}

export default TimerEntryNoteForm
