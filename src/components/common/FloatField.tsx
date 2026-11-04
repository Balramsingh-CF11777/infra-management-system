import type { ReactNode } from "react";

const SHELL =
  "relative box-border w-full max-w-full rounded-lg border border-[#dde5f2] bg-white shadow-[0_4px_12px_rgb(105_105_105/10.2%)] focus-within:border-[#5940b6] focus-within:shadow-[0_0_0_3px_rgb(89_64_182/15%)]";

/** Text control matching the floating-label field. Same size on phone and desktop. */
export function FloatField({
  label,
  children,
  className = "",
  multiline = false,
  autoHeight = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  multiline?: boolean;
  autoHeight?: boolean;
}) {
  return (
    <label className={`${SHELL} block ${autoHeight ? "min-h-[60px]" : multiline ? "h-[100px]" : "h-[60px]"} ${className}`}>
      <span className="pointer-events-none absolute left-[15px] top-2 z-[1] truncate text-[14px] font-medium leading-5 text-[#666]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const floatControlClass =
  "box-border h-full w-full border-0 bg-transparent pb-[7px] pl-[15px] pr-[15px] pt-[30px] font-sans text-[14px] font-semibold leading-5 text-[#333] outline-none placeholder:font-medium placeholder:text-[rgb(51_51_51/25%)]";

/** Multiline value sits under the floating label instead of stretching to the 60px control. */
export const floatAreaClass =
  "box-border block h-full w-full resize-none overflow-y-auto border-0 bg-transparent px-[15px] pb-2 pt-8 font-sans text-[14px] font-semibold leading-5 text-[#333] outline-none placeholder:font-medium placeholder:text-[rgb(51_51_51/25%)]";
