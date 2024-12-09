import { useEffect, useState } from "react";
import "./App.css";
import { addDays, addHours, format, startOfDay, startOfWeek } from "date-fns";
import { CompanyHours } from "./CompanyHours";
import { ColumnLines, RowLines } from "./GridLines";
import { compute, Event, PositionedEvent } from "./events";
import { Appointment, CalendarEvents } from "./CalendarEvent";
import { DndColumns, DndProvider, DraggableEvent, useDnD } from "./DnD";
import { PointerInteracton } from "./PointerInteraction";

declare module "react" {
  interface CSSProperties {
    "--grid-template-columns"?: string;
    "--scroll-y"?: number;
  }
}

/*

ToDo

- Autscrolling when you drag
- Resizing events
- Expanded day grid lines and headers
- A11y and keyboard navigation
- Smallscreen layout
- Draggin in expanded mode
- Month view
- Vertical day view
- Horizontal day view
- Day view rotation?
- Make 1440 variable
- Snap to minutes (15 fixed atm)
- Click to add new event
- All day section
- Any time of day section
- Fold time grid, expand any time of day
*/

const assignees = [
  "Joe",
  "Amy",
  "Theo",
  "Bea",
  "Mike",
  "Bart",
  "Leon",
  "Liz",
  "Jen",
  "Kim",
  "Sam",
  "Max",
  "Zoe",
  "Eva",
  "Tom",
  "Ben",
  "Lia",
  "Dan",
  "Mia",
  "Tim",
  "Tia",
  "Jon",
  "Ana",
  "Bob",
  "Eve",
  "Jim",
  "Lia",
  "Ron",
  "Liz",
  "Jen",
  "Kim",
  "Sam",
  "Max",
  "Zoe",
  "Eva",
  "Tom",
  "Ben",
  "Lia",
  "Dan",
  "Mia",
  "Tim",
  "Tia",
  "Jon",
  "Ana",
  "Bob",
  "Eve",
  "Jim",
  "Lia",
  "Ron",
]
function generateRoster(count = 50) {
  return Array.from({ length: count }, (_, i) => {
    const minutes = Math.floor(randomNumberBetween(8 * 60, 17 * 60));
    const rounded = Math.floor(minutes / 15) * 15;
    const duration = 15 + Math.floor(Math.random() * 6) * 15;

    
    const pool = [...assignees].slice(0, 10);
    const assigneeCount = randomNumberBetween(1, 2);
    const assignments = Array.from({ length: assigneeCount }, () => {
      const index = Math.floor(Math.random() * pool.length);
      return pool.splice(index, 1)[0];
    });

    return [
      i + 1,
      randomNumberBetween(1, 5),
      rounded / 60,
      rounded / 60 + duration / 60,
      assignments,
    ] as const;
  });
}

function randomNumberBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomPastelColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 100%, 80%)`;
}

const initialEvents = compute(
  generateRoster().map(([id, column, start, end, assignees]): Event => {
    return {
      id,
      start: start * 60,
      end: end * 60,
      column,
      assignees: [...assignees],
      color: randomPastelColor(),
    };
  })
);

export function App() {
  const [events, setEvents] = useState(initialEvents);

  return (
    <DndProvider
      onDrop={function onSaveDraggedEvent({ eventId, minute, column }) {
        const eventIndex = events.findIndex((event) => event.id === eventId);

        if (eventIndex >= 0) {
          const event = { ...events[eventIndex] };
          const duration = event.end - event.start;

          event.start = minute;
          event.end = minute + duration;
          event.column = column;

          const updated = [...events];
          updated.splice(eventIndex, 1, event);

          setEvents(recompute(updated));
        }
      }}
      onResize={function onResizedEvent({ eventId, minutes }) {
        const eventIndex = events.findIndex((event) => event.id === eventId);

        if (eventIndex >= 0) {
          const event = { ...events[eventIndex] };
          event.end = minutes

          const updated = [...events];
          updated.splice(eventIndex, 1, event);

          setEvents(recompute(updated));
        }
      }}
    >
      <Calendar events={events} />;
    </DndProvider>
  );
}

function Calendar({ events }: { events: PositionedEvent[] }) {
  useScrollEventsIntoView();
  const [toggledColumn, setToggledColumn] = useState(-1);
  const eventBeingDragged = useEventBeingDragged(events);

  return (
    <div
      className="root"
      data-root
      data-active-column={toggledColumn}
      onScroll={(event) => {
        event.currentTarget.style.setProperty(
          "--scroll-y",
          `${event.currentTarget.scrollTop}`
        );
      }}
      style={{
        "--grid-template-columns": Array.from({ length: 7 })
          .map((_, i) => `${i === toggledColumn ? 10 : 1}fr`)
          .join(" "),
      }}
    >
      <div className="container">
        <div className="header">
          <WeekDayLabels
            onToggleColumn={(i) =>
              setToggledColumn(i === toggledColumn ? -1 : i)
            }
          />
        </div>
        <div className="timegrid">
          <div className="time">
            <div />
            <Hours />
          </div>

          <div className="grids">
            <CompanyHours />

            <ColumnLines />

            <RowLines />

            <PointerInteracton>
              <div
                style={{
                  gridColumnStart: "var(--grid-column-start, 1)",
                  gridRowStart: "max(1, calc(var(--grid-row-start, 1) - 30))",
                  gridRowEnd: "max(60, calc(var(--grid-row-start, 0) + 30))",
                  border: "1px dotted cyan",
                  backgroundColor: "rgba(0, 100, 255, 0.1)",
                }}
              />
            </PointerInteracton>

            <CalendarEvents events={events} />

            <DndColumns>
              {eventBeingDragged && (
                <DraggableEvent event={eventBeingDragged}>
                  <Appointment assignee="X" event={eventBeingDragged} />
                </DraggableEvent>
              )}
            </DndColumns>
          </div>
        </div>
      </div>
    </div>
  );
}

function recompute(events: PositionedEvent[]) {
  return compute(
    events.map((event) => {
      return {
        id: event.id,
        column: event.column,
        start: event.start,
        end: event.end,
        assignees: [...event.assignees],
        color: event.color,
      };
    })
  );
}

function Hours() {
  const start = startOfDay(new Date());

  return twentyfour.map((_, hourOfTheDay) => (
    <div className="hour" key={hourOfTheDay}>
      <span>{format(addHours(start, hourOfTheDay), "h")}</span>
      <span className={"ampm"}>
        {format(addHours(start, hourOfTheDay), "aaa")}
      </span>
    </div>
  ));
}

function WeekDayLabels({
  onToggleColumn,
}: {
  onToggleColumn: (index: number) => void;
}) {
  const start = startOfWeek(new Date());

  return seven.map((_, dayOfTheWeekNumber) => (
    <div key={dayOfTheWeekNumber}>
      <WeekDayLabel date={addDays(start, dayOfTheWeekNumber)} />
      <button
        onClick={() => onToggleColumn(dayOfTheWeekNumber)}
        style={{
          borderRadius: 25,
          border: "none",
          marginTop: 5,
        }}
      >
        <span>{"..."}</span>
      </button>
    </div>
  ));
}

function WeekDayLabel({ date }: { date: Date }) {
  return <div>{format(date, "eee MMM dd")}</div>;
}

export default App;

const twentyfour = Array.from({ length: 24 });
const seven = Array.from({ length: 7 });

function useScrollEventsIntoView() {
  useEffect(() => {
    document
      .querySelector('[data-event-id="1"]')
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
}

function useEventBeingDragged(events: PositionedEvent[]) {
  const dragState = useDnD().state;
  const eventIdBeingDragged = "eventId" in dragState && dragState.eventId;
  return events.find((event) => event.id === eventIdBeingDragged);
}
