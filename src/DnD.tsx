import {
  createContext,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./DnD.module.css";
import { Event } from "./events";
import { PointerInteracton } from "./PointerInteraction";

declare module "react" {
  interface CSSProperties {
    "--dnd-offset--y"?: number;
    "--dnd-event--start"?: number;
    "--dnd-event--end"?: number;
  }
}

const DndContext = createContext<{
  state: State;
  onMouseDown: (eventId: number) => (event: ReactMouseEvent) => void;
  onMouseMove: () => void;
  //   onMouseUp: () => void;
}>({
  state: { value: "idle" },
  onMouseDown: () => () => undefined,
  onMouseMove: () => undefined,
  //   onMouseUp: () => undefined,
});

export function DndProvider({
  children,
  onDrop,
  onResize,
}: {
  children: React.ReactNode;
  onDrop: (payload: {
    eventId: number;
    minute: number;
    column: number;
  }) => void;
  onResize: (payload: { eventId: number; minutes: number }) => void;
}) {
  const dnd = useMachine({ onDrop, onResize });
  return <DndContext.Provider value={dnd}>{children}</DndContext.Provider>;
}

export function useDnD() {
  return useContext(DndContext);
}

type State =
  | { value: "idle" }
  | {
      value: "mouseDown" | "dragging";
      eventId: number;
      offset: { x: number; y: number };
    }
  | {
      value: "resizing";
      eventId: number;
    };

type DragEvent =
  | {
      type: "IPressMouseDown";
      eventId: number;
      offset: { x: number; y: number };
      resizing: boolean;
    }
  | { type: "IMoveMouse" }
  | { type: "IReleaseMouse" };

function useMachine({
  onDrop,
  onResize,
}: {
  onResize: (payload: { eventId: number; minutes: number }) => void;
  onDrop: (payload: {
    eventId: number;
    minute: number;
    column: number;
  }) => void;
}) {
  const [state, setState] = useState<State>({
    value: "idle",
  });

  const dispatch = useCallback(function dispatch(event: DragEvent) {
    setState((currentState) => {
      const next = handleDragEvent(currentState, event);
      return next;
    });
  }, []);

  const callbackRefs = useRef({
    onDrop,
    onResize,
    dispatch,
  });

  useLayoutEffect(() => {
    callbackRefs.current = {
      onDrop,
      onResize,
      dispatch,
    };
  }, [onDrop, onResize, dispatch]);

  const stateValue = state.value;
  const eventId = "eventId" in state ? state.eventId : null;

  useEffect(() => {
    if (stateValue !== "idle") {
      function onMouseUp() {
        if (stateValue === "dragging") {
          const el = document.querySelector(`.${styles.container} > div`);
          if (!el) return;

          const minutes =
            +getComputedStyle(el).getPropertyValue("grid-row-start");

          const column =
            +getComputedStyle(el).getPropertyValue("grid-column-start") - 1;

          callbackRefs.current.onDrop({
            eventId: eventId as number,
            minute: minutes === 1 ? 0 : minutes,
            column,
          });
        } else if (stateValue === "resizing") {
          const el = document.querySelector(`.${styles.container} > div`);
          if (!el) return;

          const minutes =
            +getComputedStyle(el).getPropertyValue("grid-row-end");

          callbackRefs.current.onResize({
            eventId: eventId as number, 
            minutes,
          });
        }

        callbackRefs.current.dispatch({ type: "IReleaseMouse" });
      }

      function onMouseMove() {
        callbackRefs.current.dispatch({ type: "IMoveMouse" });
      }

      window.addEventListener("mouseup", onMouseUp, { once: true });
      window.addEventListener("mousemove", onMouseMove, { once: true });

      return () => {
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mousemove", onMouseMove);
      };
    }
  }, [stateValue, eventId]);

  return useMemo(
    () => ({
      state,
      onMouseDown: (eventId: number) => (event: ReactMouseEvent) => {
        event.preventDefault();
        dispatch({
          type: "IPressMouseDown",
          eventId,
          offset: {
            x: event.nativeEvent.offsetX,
            y: event.nativeEvent.offsetY,
          },
          resizing:
            event.target instanceof HTMLElement &&
            "resizer" in event.target.dataset,
        });
      },
      onMouseMove: () => dispatch({ type: "IMoveMouse" }),
    }),
    [state, dispatch]
  );

  function handleDragEvent(state: State, event: DragEvent): State {
    switch (state.value) {
      case "idle":
        switch (event.type) {
          case "IPressMouseDown":
            if (event.resizing) {
              return {
                value: "resizing",
                eventId: event.eventId,
              };
            }

            return {
              value: "mouseDown",
              eventId: event.eventId,
              offset: event.offset,
            };
          default:
            return { value: "idle" };
        }

      case "mouseDown":
        switch (event.type) {
          case "IMoveMouse":
            return { ...state, value: "dragging" };
          case "IReleaseMouse":
            return { value: "idle" };
          default:
            return state;
        }

      case "dragging":
      case "resizing":
        switch (event.type) {
          case "IReleaseMouse":
            return { value: "idle" };
          default:
            return state;
        }
    }
  }
}

export function DndColumns({ children }: { children: React.ReactNode }) {
  const { state } = useDnD();

  if (state.value === "dragging" || state.value === "resizing") {
    return (
      <PointerInteracton
        data-state={state.value}
        className={styles.container}
        style={{
          "--dnd-offset--y": "offset" in state ? state.offset.y : 0,
        }}
      >
        {children}
      </PointerInteracton>
    );

  }

  return null;
}

export function DraggableEvent({
  children,
  event,
}: {
  children: React.ReactNode;
  event: Event;
}) {
  return (
    <div
      style={{
        "--dnd-event--start": event.start,
        "--dnd-event--end": event.end,
      }}
    >
      {children}
    </div>
  );
}
