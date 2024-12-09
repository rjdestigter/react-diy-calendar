import { useDnD } from "./DnD";
import { PositionedEvent } from "./events";
import styles from "./CalendarEvent.module.css";

declare module "react" {
  interface CSSProperties {
    "--offset-start"?: number;
    "--expanded-columns"?: number;
    "--expanded-offset"?: number;
    "--width"?: number;
    "--columns"?: number;
    "--start"?: number;
    "---end"?: number;
    "--column"?: number;
    "--color"?: string;
  }
}

export function CalendarEvents({ events }: { events: PositionedEvent[] }) {
  return (
    <div className={styles.events}>
      {events.map((event) => {
        return <CalendarEvent key={event.id} event={event} />;
      })}
    </div>
  );
}

export function CalendarEvent({ event }: { event: PositionedEvent }) {
    const { onMouseDown, state } = useDnD();
  const [first] = event.assignees;
  const assigneesInCluster = [...event.cluster.assignees];

  return (
    <div
      key={event.id}
      data-event-id={event.id}
      className={styles.event}
      data-assignees={event.assignees.join(",")}
      data-dragging={state.value === "dragging" && state.eventId === event.id}
      data-event-column={event.column}
      style={{
        "--column": event.column,
        "--offset-start": event.offset,
        "--expanded-columns": assigneesInCluster.length,
        "--width": event.offset + 1 === event.cluster.maxOffset ? 1 : 2,
        "--columns": event.cluster.maxOffset,
        "--start": event.start || 1,
        "---end": event.end,
        "--color": event.color,
      }}
    >
      {event.assignees.map((assignee) => {
        return (
          <div
            key={assignee}
            className={styles.content}
            data-assignee={assignee}
            data-single-assignee
            style={{
              "--expanded-offset": assigneesInCluster.indexOf(assignee),
            }}
          >
            <Appointment event={event} assignee={assignee} />
          </div>
        );
      })}
      <div
        className={styles.content}
        data-combined-assignees
        data-assignee={first}
        style={{
          "--expanded-offset": assigneesInCluster.indexOf(first),
        }}
        onMouseDown={onMouseDown(event.id)}
      >
        <Appointment event={event} assignee={event.assignees.join(", ")} />
        <div className={styles.resizer} data-resizer />
      </div>
    </div>
  );
}

export function Appointment({
  event,
  assignee,
}: {
  event: PositionedEvent;
  assignee: string;
}) {
  return (
    <div className={styles.appointment} data-event-content>
      {event.id}: {assignee}
    </div>
  );
}
