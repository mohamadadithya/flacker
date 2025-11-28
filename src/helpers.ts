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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);

  a.click();

  const timeout = setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 30_000); // 30s

  // Return cleanup function (optional to call)
  return () => {
    clearTimeout(timeout);
    URL.revokeObjectURL(url);
    a.remove();
  };
}

export { fileSetter, cn, downloadBlob };
