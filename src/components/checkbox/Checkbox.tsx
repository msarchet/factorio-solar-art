import { PropsWithChildren } from "react";
import "./Checkbox.css";

interface Props {
  value: boolean;
  setValue: (value: boolean) => void;
  hint: string;
}

export const Checkbox = (props: PropsWithChildren<Props>) => {
  const { value, setValue, children, hint } = props;

  return (
    <div className="checkbox" title={hint}>
      {children}
      <input
        type="checkbox"
        className="checkbox-input"
        checked={value}
        onChange={() => setValue(!value)}
      />
    </div>
  );
};
