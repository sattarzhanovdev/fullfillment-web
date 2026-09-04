"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Поле сканирования штрихкода: сканер работает как клавиатура, печатает код
 * и присылает Enter (ТЗ §56 — "Сканирование → Enter → следующий товар").
 * Всегда держит фокус, чтобы оператор не тянулся к мыши.
 */
export function ScanInput({
  onScan,
  disabled,
  placeholder = "Наведите сканер и отсканируйте штрихкод…",
  className,
  id,
}: {
  onScan: (code: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  });

  useEffect(() => {
    function refocus(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a")) return;
      ref.current?.focus();
    }
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

  return (
    <Input
      ref={ref}
      id={id}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus
      className={cn("font-mono text-[15px]", className)}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const code = value.trim();
          setValue("");
          if (code) onScan(code);
        }
      }}
    />
  );
}
