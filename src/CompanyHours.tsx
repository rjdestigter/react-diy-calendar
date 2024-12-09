import styles from "./CompanyHours.module.css";

const companyHours = [
  [0, 0],
  [9, 17],
  [9, 17],
  [9, 15],
  [9, 17],
  [10, 14],
  [9, 12],
] as const;

declare module "react" {
  interface CSSProperties {
    "--week-day"?: number;
    "--start"?: number;
    "--end"?: number;
  }
}

export function CompanyHours() {
  return (
    <div className={styles.companyHours}>
      {companyHours.map(([start, end], weekDay) => {
        if (start + end === 0) {
          return null;
        }

        return (
          <div
            key={weekDay}
            className={styles.companyHour}
            style={
              {
                "--week-day": weekDay + 1,
                "--start": start * 60,
                "--end": end * 60,
              }
            }
          >
            <div />
          </div>
        );
      })}
    </div>
  );
}
