import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function fileSetter(
  event: React.ChangeEvent<HTMLInputElement>,
  setter: (file: File | null) => void,
) {
  const file = event.target.files?.[0];
  setter(file || null);

  return file;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export { fileSetter, cn, downloadBlob };
