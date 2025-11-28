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

const isAndroid = /Android/i.test(navigator.userAgent);

function downloadBlob(blob: Blob, filename: string) {
  if (!blob || blob.size === 0) {
    console.error("blob is empty or invalid", blob);
    throw new Error("FLAC File is not valid!");
  }

  const url = URL.createObjectURL(blob);

  if (isAndroid) {
    window.open(url, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30_000);
    return;
  }

  const a = document.createElement("a");

  a.href = url;
  a.download = filename || "output.flac";
  a.style.display = "none";
  document.body.appendChild(a);

  a.click();

  const timeout = setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 30_000);

  return () => {
    clearTimeout(timeout);
    URL.revokeObjectURL(url);
    a.remove();
  };
}

export { fileSetter, cn, downloadBlob };
