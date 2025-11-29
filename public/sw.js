const CACHE_NAME = "ffmpeg-cache-v1";

const FFMPEG_URLS = [
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm/ffmpeg-core.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm/ffmpeg-core.wasm",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm/ffmpeg-core.worker.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FFMPEG_URLS)),
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (!FFMPEG_URLS.some((x) => url.startsWith(x))) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const res = await fetch(event.request);
      cache.put(event.request, res.clone());
      return res;
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
});
