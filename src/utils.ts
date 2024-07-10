import { Dispatch } from "react";
import { Entry, Task, TimerInfo } from "./types";

export function handleTimer({
  activeTask,
  setTimer
}: {
  activeTask: Task,
  setTimer: (time: string) => void
}) {
  const startTimeDate = new Date(
    activeTask.timer_info ? activeTask.timer_info.start_time : ""
  );

  const interval = setInterval(() => {
    const now = new Date();
    const elapsedTime = now.getTime() - startTimeDate.getTime();

    const seconds = Math.floor((elapsedTime / 1000) % 60);
    const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
    const hours = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24);

    const formattedTime = [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");

    setTimer(formattedTime);
  }, 1000);

  return () => clearInterval(interval);
}

export function getEllapsedTime({activeTask, context}: {
  activeTask: Task,
  context: string
}) {
  const startTimeDate = new Date(activeTask.timer_info ? activeTask.timer_info.start_time : "");

  const now = new Date();
  const elapsedTime = now.getTime() - startTimeDate.getTime();

  const seconds = Math.floor((elapsedTime / 1000) % 60);
  const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
  const hours = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24);

  const formattedTime = context === "menubar"
    ? [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
    ].join(":")
    : [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");

  return formattedTime;
}
