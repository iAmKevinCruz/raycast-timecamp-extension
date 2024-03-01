import React from "react";
import { useNavigation, getPreferenceValues, showHUD, showToast, ActionPanel, Action, Form, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import type { Task, FormData, Preferences } from "../types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

type TimerEntryNoteFormProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
};

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

  const updateNote = async (entryId: number | string, values: FormData, close: boolean) => {
    const noteString: string = values.note;
    try {
      await mutate(
        fetch("https://app.timecamp.com/third_party/api/entries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: entryId, note: noteString, billable: values.billable }),
        }),
        {
          async optimisticUpdate() {
            const tempTask = activeTask;

            if (tempTask.timer_info) {
              tempTask.timer_info.note = noteString;
            }

            if (tempTask.entry) {
              tempTask.entry.billable = values.billable ? 1 : 0;
            }

            setActiveTask(tempTask);
            pop();
            if (close) {
              await showHUD("✅ Entry Saved", { clearRootSearch: true });
            } else {
              await showToast({
                style: Toast.Style.Success,
                title: "✅ Entry Saved",
              });
            }
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
  };

  return (
    <Form
      navigationTitle="Edit Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Edits & Close Window"
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values, true)
            }
          />
          <Action.SubmitForm
            title="Save Edits"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values, false)
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
      <Form.Checkbox
        id="billable"
        label="Billable"
        defaultValue={activeTask.entry ? (activeTask.entry.billable ? true : false) : true}
      />
    </Form>
  );
}

export default TimerEntryNoteForm;
