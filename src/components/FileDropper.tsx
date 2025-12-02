import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppContext } from "../contexts/app.context";
import Container from "./Container";

export default function FileDropper() {
  const [isShowDropper, setIsShowDropper] = useState(false);
  const { appFormHook, appFormRef } = useAppContext();

  const dragCounter = useRef(0);

  const handleFileDrop = useCallback((event: DragEvent) => {
    event.preventDefault();

    const { dataTransfer } = event;
    if (!dataTransfer) return;

    const { files } = dataTransfer;
    if (!files || files.length === 0) return;

    const allowedImages = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    const cueExt = ".cue";

    const dropped = {
      flac: null as File | null,
      cue: null as File | null,
      cover: null as File | null,
      errors: [] as string[],
    };

    for (const file of files) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if (file.type === "audio/flac" || ext === ".flac") {
        if (dropped.flac) {
          dropped.errors.push(
            `Multiple FLAC files detected: "${file.name}" ignored.`,
          );
          continue;
        }

        dropped.flac = file;
        continue;
      }

      if (ext === cueExt) {
        if (dropped.cue) {
          dropped.errors.push(
            `Multiple CUE files detected: "${file.name}" ignored.`,
          );
          continue;
        }

        dropped.cue = file;
        continue;
      }

      if (allowedImages.includes(file.type)) {
        if (dropped.cover) {
          dropped.errors.push(
            `Multiple cover images detected: "${file.name}" ignored.`,
          );
          continue;
        }
        dropped.cover = file;
        continue;
      }

      dropped.errors.push(`"${file.name}" is not a supported format.`);
    }

    if (dropped.errors.length > 0) {
      toast.error("Some files were not accepted", {
        description: dropped.errors.join("\n"),
      });
    }

    return dropped;
  }, []);

  useEffect(() => {
    const target = document.documentElement;

    const isFileDrag = (event: DragEvent) => {
      const dt = event.dataTransfer;
      if (!dt) return false;

      return Array.from(dt.types).includes("Files");
    };

    const handleDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();

      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setIsShowDropper(true);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();

      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsShowDropper(false);
      }
    };

    const handleDragEnd = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();

      dragCounter.current = 0;
      setIsShowDropper(false);
    };

    const handleDropEvent = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();

      dragCounter.current = 0;
      setIsShowDropper(false);

      const dropped = handleFileDrop(event);

      if (dropped && appFormHook) {
        const { flac, cue, cover } = dropped;
        const { setValue } = appFormHook;

        if (flac) setValue("audioFile", flac, { shouldValidate: true });
        if (cue) setValue("cueFile", cue, { shouldValidate: true });
        if (cover) setValue("albumCover", cover, { shouldValidate: true });

        appFormRef.current?.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true }),
        );
      }
    };

    target.addEventListener("dragenter", handleDragEnter);
    target.addEventListener("dragover", handleDragOver);
    target.addEventListener("dragleave", handleDragLeave);
    target.addEventListener("dragend", handleDragEnd);
    target.addEventListener("drop", handleDropEvent);

    return () => {
      target.removeEventListener("dragenter", handleDragEnter);
      target.removeEventListener("dragover", handleDragOver);
      target.removeEventListener("dragleave", handleDragLeave);
      target.removeEventListener("dragend", handleDragEnd);
      target.removeEventListener("drop", handleDropEvent);
    };
  }, [handleFileDrop, appFormHook, appFormRef]);

  return (
    <>
      {isShowDropper && (
        <div
          aria-label="File dropper"
          id="drop-target"
          className="fixed inset-0 size-full bg-black/30 backdrop-blur-sm grid place-items-center"
        >
          <Container>
            <div className="w-full max-w-md mx-auto text-center space-y-6">
              <img
                src="/files-vector.svg"
                className="w-full max-w-32 sm:max-w-44 mx-auto"
                alt="Files"
              />
              <p className="text-balance sm:text-2xl font-medium">
                Drop your FLAC, CUE and album cover here...
              </p>
            </div>
          </Container>
        </div>
      )}
    </>
  );
}
