"use client";

import { useMemo, useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import type { Task } from "@/types/task";
import { priorityColor } from "@/lib/filters";
import "react-big-calendar/lib/css/react-big-calendar.css";

function useLocalizer() {
  const [localizer, setLocalizer] = useState<ReturnType<typeof dateFnsLocalizer> | null>(null);

  useEffect(() => {
    (async () => {
      const { enUS } = await import("date-fns/locale/en-US");
      const l = dateFnsLocalizer({
        format,
        parse,
        startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
        getDay,
        locales: { "en-US": enUS },
      });
      setLocalizer(l);
    })();
  }, []);

  return localizer;
}

type TaskCalendarProps = {
  tasks: Task[];
};

export function TaskCalendar({ tasks }: TaskCalendarProps) {
  const localizer = useLocalizer();

  const events: Event[] = useMemo(
    () =>
      tasks
        .filter((t) => t.due_date)
        .map((t) => ({
          title: t.title,
          start: new Date(t.due_date! + "T00:00:00"),
          end: new Date(t.due_date! + "T23:59:59"),
          resource: t,
        })),
    [tasks]
  );

  const eventStyleGetter = (event: Event) => {
    const task = event.resource as Task;
    const color = priorityColor(task.priority);
    return {
      style: {
        backgroundColor: color + "20",
        borderLeft: `3px solid ${color}`,
        color: "#26251e",
        borderRadius: "4px",
        fontSize: "13px",
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
      },
    };
  };

  if (!localizer) {
    return <div className="card p-4 h-[500px] flex items-center justify-center text-muted">Loading calendar...</div>;
  }

  return (
    <div className="card p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={eventStyleGetter}
        views={["month", "week", "day"]}
        defaultView="month"
        onView={() => {}}       
        className="font-sans"
      />
    </div>
  );
}
