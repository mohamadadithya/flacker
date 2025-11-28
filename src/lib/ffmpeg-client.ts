import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

export function getFFmpegInstance(silentLog = false) {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();

    if (!silentLog) {
      ffmpegInstance.on("log", ({ message }) => {
        console.log("[ffmpeg]", message);
      });
    }
  }
  return ffmpegInstance;
}

export function loadFFmpeg(baseURL: string = BASE_URL) {
  if (loadPromise) return loadPromise;

  const ffmpeg = getFFmpegInstance(true);

  loadPromise = (async () => {
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
  })();

  return loadPromise;
}
