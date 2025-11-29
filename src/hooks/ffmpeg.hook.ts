import { useEffect, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { getFFmpegInstance, isFFmpegWasmCached } from "../lib/ffmpeg-client";

export function useFFmpeg() {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>();
  const [isLoaded, setIsLoaded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const isCached = await isFFmpegWasmCached("ffmpeg-cache-v1", {
          silentLog: true,
        });

        if (!isCached) setIsLoaded(false);

        const instance = await getFFmpegInstance({ silentLog: true });

        if (cancelled) return;

        setFfmpeg(instance);
        setIsLoaded(true);
        setError(null);
      } catch (err) {
        console.error("Error loading FFmpeg:", err);
        if (cancelled) return;

        setIsLoaded(false);
        setError(err instanceof Error ? err.message : "Unknown FFmpeg error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ffmpeg, isLoaded, error };
}
