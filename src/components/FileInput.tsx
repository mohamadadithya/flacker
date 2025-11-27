import type React from "react";
import type { RefCallBack } from "react-hook-form";

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError: boolean;
  ref: RefCallBack;
  mimeTypes?: string[] | string;
}

export function FileInput({
  isError,
  ref,
  mimeTypes,
  ...restProps
}: CustomInputProps) {
  return (
    <input
      type="file"
      ref={ref}
      accept={Array.isArray(mimeTypes) ? mimeTypes.join(",") : mimeTypes}
      className={`file-input w-full block mt-2.5 ${isError ? "not-disabled:file-input-error" : ""}`}
      {...restProps}
    />
  );
}
