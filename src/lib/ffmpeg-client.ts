import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const DEFAULT_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

type FFmpegOptions = {
  baseURL?: string;
  silentLog?: boolean;
};

/**
 * Always async — returns FFmpeg instance that is ready to use.
 * - Loads only once
 * - Safe for concurrent calls
 */
export async function getFFmpegInstance(
  options: FFmpegOptions = {},
): Promise<FFmpeg> {
  const { baseURL = DEFAULT_BASE_URL, silentLog = false } = options;

  // Already loaded → return instantly
  if (ffmpegInstance) return ffmpegInstance;

  // Load is ongoing → wait for it
  if (loadPromise) return loadPromise;

  // First time → prepare loading workflow
  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    if (!silentLog) {
      ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
    }

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
      workerURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        "text/javascript",
      ),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}
