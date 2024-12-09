import { MouseEvent, useLayoutEffect, useRef } from "react";
import styles from "./PointerInteracton.module.css";

declare module "react" {
  interface CSSProperties {
    "--pointer-interaction--x"?: number;
    "--pointer-interaction--y"?: number;
  }
}

type PointerInteractionProps = {
  children?: React.ReactNode;
  onClick?: (payload: {
    minute: number;
    column: number;
    event: MouseEvent;
  }) => void;
  onMouseMove?: (payload: {
    minute: number;
    column: number;
    event: MouseEvent;
  }) => void;
} & Record<`data-${string}`, string | number | boolean> & Pick<React.HTMLAttributes<HTMLDivElement>, "style" | "className">;

export function PointerInteracton({
  children,
  className,
  onClick,
  onMouseMove,
  ...props
}: PointerInteractionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    el.style.setProperty(
      "--pointer-interaction--top",
      `${
        el.getBoundingClientRect().top +
        +getComputedStyle(el).getPropertyValue("--scroll-y")
      }`
    );
    el.style.setProperty(
      "--pointer-interaction--left",
      `${el.getBoundingClientRect().left}`
    );

    el.style.setProperty(
      "--pointer-interaction--width",
      `${el.getBoundingClientRect().width}`
    );

    el.style.setProperty(
      "--pointer-interaction--height",
      `${el.getBoundingClientRect().height}`
    );
  }, []);

  function dispatch(cb: typeof onClick, event: MouseEvent) {
    const el = ref.current;
    if (!el || !cb) return;
    const computedStyle = getComputedStyle(el);
    const minute = +computedStyle.getPropertyValue("--grid-row-start");
    const column = +computedStyle.getPropertyValue("--grid-column-start") - 1;

    cb({ minute, column, event });
  }

  return (
    <div
      {...props}
      className={`${styles.container}${className ? ` ${className}` : ""}`}
      ref={ref}
      onMouseMove={function (event) {
        ref.current?.style.setProperty(
          "--pointer-interaction--x",
          `${event.pageX}`
        );

        ref.current?.style.setProperty(
          "--pointer-interaction--y",
          `${event.pageY}`
        );

        dispatch(onMouseMove, event);
      }}
      onClick={function (event) {
        dispatch(onClick, event);
      }}
    >
      {children}
    </div>
  );
}
