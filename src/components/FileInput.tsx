import type React from "react";
import type { RefCallBack } from "react-hook-form";
import { cn } from "../helpers";

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
  ref: RefCallBack;
  mimeTypes?: string[] | string;
  className?: string;
}

export function FileInput({
  isError = false,
  ref,
  mimeTypes,
  className = "",
  ...restProps
}: CustomInputProps) {
  return (
    <input
      type="file"
      ref={ref}
      accept={Array.isArray(mimeTypes) ? mimeTypes.join(",") : mimeTypes}
      className={`file-input ${cn("w-full block mt-2.5", className)} ${isError ? "not-disabled:file-input-error" : ""}`}
      {...restProps}
    />
  );
}
