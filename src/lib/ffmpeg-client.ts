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
 * Checks if the 'ffmpeg-core.wasm' file is stored within a specified cache.
 * @param {string} cacheName The name of the cache to check (default: 'ffmpeg-core').
 * @returns {Promise<boolean>} True if the wasm file is found, false otherwise.
 */
export async function isFFmpegWasmCached(
  cacheName = "ffmpeg-core",
  options: Partial<{ silentLog: boolean }> = {
    silentLog: false,
  },
) {
  if (!("caches" in window)) {
    console.error("Cache API is not supported in this browser.");
    return false;
  }

  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const wasmFound = requests.some((request) =>
      request.url.includes("ffmpeg-core.wasm"),
    );

    if (!options.silentLog) {
      if (wasmFound) {
        console.log(`✅ ffmpeg-core.wasm found in cache '${cacheName}'.`);
        // Optional: Log all cached URLs if needed for debugging
        // console.log('Cached URLs:', requests.map(req => req.url).sort());
      } else {
        console.log(`⚠️ ffmpeg-core.wasm not found in cache '${cacheName}'.`);
      }
    }

    return wasmFound;
  } catch (error) {
    console.error(`Error accessing cache '${cacheName}':`, error);
    return false;
  }
}

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
