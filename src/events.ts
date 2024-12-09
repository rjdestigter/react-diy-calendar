export type Event = {
  id: number;
  column: number;
  start: number; // Start time in minutes (e.g., 60 for 1:00 AM)
  end: number; // End time in minutes (e.g., 120 for 2:00 AM)
  assignees: string[];
  color: string;
};

export type Cluster = {
  maxOffset: number;
  events: EventBeingPositioned[];
  assignees: Set<string>;
};

export type EventBeingPositioned = Event & {
  offset?: number;
  cluster?: Cluster;
};

export type PositionedEvent = Required<EventBeingPositioned>;

export function compute(data: Event[]) {
  const byColumn = data.reduce((acc, event) => {
    if (!acc[event.column]) {
      acc[event.column] = [];
    }
    acc[event.column].push(event);
    return acc;
  }, {} as Record<number, Event[]>);

  return Object.values(byColumn).flatMap((column) => {
    return computeColumn(column);
  });
}

export function computeColumn(data: Event[]) {
  const sorted = sortEventsByStartAndDuration(data) as EventBeingPositioned[];

  let cluster: Cluster = {
    maxOffset: 0,
    events: [] as EventBeingPositioned[],
    assignees: new Set(),
  };

  sorted.forEach((event) => {
    const overlapping = getOverlapping(event, sorted);
    const segment = [event, ...overlapping];
    const addingToCluster = segment.some(isPositioned);
    const availableOffsets: number[] = [];

    // Finds an offset position for an even int he current cluster
    // A cluster can have events with the same offset if they don't overlap directly
    const findOffset = (eventNeedingOffset: EventBeingPositioned): number => {
      // The max offset for a cluster can be equals to or less than the length of a cluster
      const inspectedOffsets: boolean[] = Array.from({
        length: cluster.events.length,
      });

      cluster.events
        .filter(isPositioned)
        .forEach((positionedEventInCluster) => {
          const { offset } = positionedEventInCluster;

          const offsetIsNotYetExcluded = inspectedOffsets[offset] !== false;
          const doesNotOverlap =
            offsetIsNotYetExcluded &&
            !eventsOverlap(eventNeedingOffset, positionedEventInCluster);
          const offsetIsAvailable = offsetIsNotYetExcluded && doesNotOverlap;

          if (offsetIsAvailable) {
            inspectedOffsets[offset] = true;
          } else {
            // This might override previously set "true" since duplicate offsets within a cluster are possible
            inspectedOffsets[offset] = false;
          }
        });

      const offsetIndex = inspectedOffsets.findIndex((_) => _);

      if (offsetIndex >= 0) {
        return offsetIndex;
      }

      // If no offset was available that means we need to increase the maxOffset for the cluster as there
      // will be more events positioned horizontally for that cluster
      cluster.maxOffset++;

      return cluster.maxOffset - 1;
    };

    if (addingToCluster === false) {
      cluster = {
        maxOffset: 0,
        events: [],
        assignees: cluster.assignees,
      };
    }

    // Add unpositioned events to current cluster
    segment.forEach((segmentedEvent) => {
      segmentedEvent.assignees.forEach((_) => cluster.assignees.add(_));
      if (!isPositioned(segmentedEvent)) {
        cluster.events.push(segmentedEvent);
      }
    });

    // This is assuming that if the current event is positioned then all
    // offsets less than the current event are available but I'm not sure
    // if this is true for all cases. Removing this doesn't seem to impact
    // the expected layout at this time so might be safe to remove if I
    // find this isn't always true
    for (let i = event.offset || 0; i > 0; i--) {
      availableOffsets.push(i - 1);
    }

    // A
    segment.filter(isNotPositioned).forEach((eventBeingPositioned, index) => {
      eventBeingPositioned.cluster = cluster;

      function getOffset() {
        // If we're not adding to an existing cluster then the next overlapping
        // event in the segment is just assigned the current index as it's offset
        if (!addingToCluster) {
          cluster.maxOffset++;
          return index;
        }

        // Again, this might not work for all cases. I haven't thoroughly tested it
        const availableOffset = availableOffsets.pop();
        if (availableOffset != null) {
          return availableOffset;
        }

        return findOffset(eventBeingPositioned);
      }

      eventBeingPositioned.offset = getOffset();
    });
  });

  return sortEventsByOffsetStartAndDuration(sorted as PositionedEvent[]);
}

function getOverlapping<T extends Event>(base: T, events: T[]) {
  return events.filter((event) => {
    if (event.id !== base.id) {
      return eventsOverlap(event, base);
    }

    return false;
  });
}

function eventsOverlap(event: Event, base: Event) {
  const eventStartOverlapsWithBase =
    event.start > base.start && event.start < base.end;

  if (eventStartOverlapsWithBase) return true;

  const eventEndOverlapsWithBase =
    event.end > base.start && event.end < base.end;

  return eventEndOverlapsWithBase;
}

function sortEventsByStartAndDuration(events: Event[]) {
  return [...events].sort((a, b) => {
    if (a.start === b.start) {
      if (a.end > b.end) {
        return -1;
      }

      return 1;
    }

    if (a.start < b.start) {
      return -1;
    }

    return 1;
  });
}

function sortEventsByOffsetStartAndDuration(events: PositionedEvent[]) {
  return [...events].sort((a, b) => {
    if (a.offset < b.offset) {
      return -1;
    }

    if (a.offset > b.offset) {
      return 1;
    }

    if (a.start === b.start) {
      if (a.end > b.end) {
        return -1;
      }

      return 1;
    }

    if (a.start < b.start) {
      return -1;
    }

    return 1;
  });
}

function isPositioned(event: EventBeingPositioned): event is PositionedEvent {
  return event.offset != null;
}

function isNotPositioned(
  event: EventBeingPositioned
): event is EventBeingPositioned {
  return !isPositioned(event);
}
