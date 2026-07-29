"use client";

import { cn } from "@/lib/format";
import { optionKey } from "@/lib/questionTypes";

export function ChoiceOption({
  index,
  selected = false,
  answerColor,
  buttonColor,
  onClick,
  children,
  as = "button",
  className,
}: {
  index: number;
  selected?: boolean;
  answerColor: string;
  buttonColor: string;
  onClick?: () => void;
  children: React.ReactNode;
  as?: "button" | "div";
  className?: string;
}) {
  const Wrapper = as;

  return (
    <Wrapper
      {...(as === "button" ? { type: "button" as const, onClick } : {})}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[7px] border-[1.5px] px-3.5 py-2.5 text-left",
        "transition-[background-color,border-color] duration-150",
        className,
      )}
      style={{
        borderColor: selected ? buttonColor : `${answerColor}59`,
        background: selected ? `${buttonColor}1a` : `${answerColor}0d`,
        color: answerColor,
      }}
    >
      <span
        className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[4px] border text-[12px] font-medium"
        style={{
          borderColor: selected ? buttonColor : `${answerColor}66`,
          background: selected ? buttonColor : "transparent",
          color: selected ? "#fff" : answerColor,
        }}
        aria-hidden="true"
      >
        {optionKey(index)}
      </span>
      <span className="min-w-0 flex-1 text-[17px]">{children}</span>
    </Wrapper>
  );
}
