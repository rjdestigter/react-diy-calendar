export function RowLines() {
  return (
    <div className="rows" onClick={e => {
        console.log(e);
    }}>
      <div />
      {twentyfour.map((_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}

export function ColumnLines() {
  return (
    <div className="columns">
      {seven.map((_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}


const twentyfour = Array.from({ length: 24 });
const seven = Array.from({ length: 7 });
