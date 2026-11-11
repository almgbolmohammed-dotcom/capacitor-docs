import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function DateInput({ value, onChange, className }: DateInputProps) {
  const parts = value ? value.split("-") : [];
  const initY = parts[0] || "";
  const initM = parts[1] ? String(parseInt(parts[1])) : "";
  const initD = parts[2] ? String(parseInt(parts[2])) : "";

  const [y, setY] = useState(initY);
  const [m, setM] = useState(initM);
  const [d, setD] = useState(initD);

  useEffect(() => {
    const p = value ? value.split("-") : [];
    setY(p[0] || "");
    setM(p[1] ? String(parseInt(p[1])) : "");
    setD(p[2] ? String(parseInt(p[2])) : "");
  }, [value]);

  function emit(year: string, month: string, day: string) {
    if (year.length === 4 && month && day) {
      const mo = month.padStart(2, "0");
      const da = day.padStart(2, "0");
      onChange(`${year}-${mo}-${da}`);
    }
  }

  const inputCls = "border rounded-md text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background h-9";

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)} dir="ltr">
      <input
        type="number" min="1" max="31" placeholder="يوم"
        value={d}
        onChange={e => { setD(e.target.value); emit(y, m, e.target.value); }}
        className={cn(inputCls, "w-14")}
      />
      <span className="text-muted-foreground">/</span>
      <input
        type="number" min="1" max="12" placeholder="شهر"
        value={m}
        onChange={e => { setM(e.target.value); emit(y, e.target.value, d); }}
        className={cn(inputCls, "w-14")}
      />
      <span className="text-muted-foreground">/</span>
      <input
        type="number" min="2020" max="2040" placeholder="سنة"
        value={y}
        onChange={e => { setY(e.target.value); emit(e.target.value, m, d); }}
        className={cn(inputCls, "w-20")}
      />
    </div>
  );
}
