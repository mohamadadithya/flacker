import { useEffect, useState } from "react";
import { getFFmpegInstance, loadFFmpeg } from "../lib/ffmpeg-client";

export function useFFmpeg() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadFFmpeg()
      .then(() => {
        if (!cancelled) {
          setIsLoaded(true);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Error loading FFmpeg:", err);
        if (!cancelled) {
          setIsLoaded(false);
          setError(err instanceof Error ? err.message : "Unknown FFmpeg error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ffmpeg = getFFmpegInstance(true);

  return { ffmpeg, isLoaded, error };
}
