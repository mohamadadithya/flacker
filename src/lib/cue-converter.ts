import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type CueTrack = {
  track: number;
  title?: string;
  performer?: string;
  index?: string;
};

type CueSheet = {
  album?: string;
  performer?: string;
  file?: string;
  tracks: CueTrack[];
};

type TrackSheetRow = {
  no: number;
  title: string;
  performer?: string;
  indexRaw: string;
  startSeconds: number;
  duration: string;
};

type TrackSplitPlan = {
  track: number;
  title?: string;
  startSeconds: number;
  endSeconds: number | null;
  startTime: string;
  durationSeconds: number | null;
  durationTime: string | null;
};

interface CueValidationResult {
  ok: boolean;
  errors: string[];
}

function parseCueText(text: string): CueSheet {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const sheet: CueSheet = { tracks: [] };

  let currentTrack: CueTrack | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("REM")) continue;

    if (line.startsWith("FILE")) {
      sheet.file = extractQuoted(line);
      continue;
    }

    if (line.startsWith("TRACK")) {
      const match = line.match(/TRACK\s+(\d+)/);
      const num = match ? Number(match[1]) : sheet.tracks.length + 1;
      currentTrack = { track: num };
      sheet.tracks.push(currentTrack);
      continue;
    }

    if (line.startsWith("TITLE")) {
      const value = extractQuoted(line);
      if (!currentTrack) {
        sheet.album = value ?? sheet.album;
      } else {
        currentTrack.title = value ?? currentTrack.title;
      }
      continue;
    }

    if (line.startsWith("PERFORMER")) {
      const value = extractQuoted(line);
      if (!currentTrack) {
        sheet.performer = value ?? sheet.performer;
      } else {
        currentTrack.performer = value ?? currentTrack.performer;
      }
      continue;
    }

    if (line.startsWith("INDEX 01") && currentTrack) {
      const match = line.match(/INDEX 01\s+(\S+)/);
      if (match) currentTrack.index = match[1]; // e.g. "03:06:20"
      continue;
    }
  }

  return sheet;
}

function extractQuoted(line: string): string | undefined {
  const match = line.match(/"(.+?)"/);
  return match?.[1];
}

function cueIndexToSeconds(index: string): number {
  const [mm, ss, ff] = index.split(":").map(Number);
  if ([mm, ss, ff].some((v) => Number.isNaN(v)) || mm < 0 || ss < 0 || ff < 0) {
    return 0;
  }
  return mm * 60 + ss + ff / 75;
}

function secondsToFfmpegTime(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec - hours * 3600 - minutes * 60;

  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  const s = seconds.toFixed(3).padStart(6, "0"); // "03.200" dll

  return `${h}:${m}:${s}`;
}

function formatCueTime(seconds: number) {
  const totalFrames = Math.round(seconds * 75);

  const minutes = Math.floor(totalFrames / (75 * 60));
  const secs = Math.floor((totalFrames % (75 * 60)) / 75);
  const frames = totalFrames % 75;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

async function getAudioDurationFromFile(
  ffmpeg: FFmpeg,
  file: File,
  virtualName: string,
): Promise<number> {
  await ffmpeg.writeFile(virtualName, await fetchFile(file));

  let duration: number | null = null;

  const handler = (e: { type: string; message: string }) => {
    const match = e.message.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const h = Number(match[1]);
      const m = Number(match[2]);
      const s = Number(match[3]);
      duration = h * 3600 + m * 60 + s;
    }
  };

  ffmpeg.on("log", handler);

  await ffmpeg.exec(["-i", virtualName, "-f", "null", "-"]);

  // (opsional) lepas listener lagi kalau kamu simpan reference ffmpeg.on
  // ffmpeg.off?.("log", handler);

  if (duration == null) {
    throw new Error("Tidak bisa membaca durasi audio dari ffmpeg.");
  }

  return duration;
}

function buildTrackSheet(
  sheet: CueSheet,
  albumTotalSeconds: number,
): TrackSheetRow[] {
  const starts = sheet.tracks
    .filter((t) => t.index)
    .map((t) => cueIndexToSeconds(t.index!));

  return sheet.tracks
    .filter((t) => t.index)
    .map((t, i) => {
      const start = starts[i];
      const end = i < starts.length - 1 ? starts[i + 1] : albumTotalSeconds;
      const durationSeconds = Math.max(0, end - start);

      return {
        no: t.track,
        title: t.title ?? `Track ${t.track}`,
        performer: t.performer ?? sheet.performer,
        indexRaw: t.index!,
        startSeconds: start,
        durationSeconds,
        duration: formatCueTime(durationSeconds),
      };
    });
}

function buildSplitPlan(
  sheet: CueSheet,
  totalDurationSeconds?: number,
): TrackSplitPlan[] {
  const tracksWithIndex = sheet.tracks.filter((t) => t.index);

  if (tracksWithIndex.length === 0) return [];

  const starts = tracksWithIndex.map((t) => cueIndexToSeconds(t.index!));

  return tracksWithIndex.map((track, idx) => {
    const start = starts[idx];
    const nextStart = idx < starts.length - 1 ? starts[idx + 1] : undefined;
    const end =
      nextStart !== undefined ? nextStart : (totalDurationSeconds ?? null);

    const durationSeconds =
      end !== null && end !== undefined ? Math.max(0, end - start) : null;

    return {
      track: track.track,
      title: track.title,
      startSeconds: start,
      endSeconds: end ?? null,
      startTime: secondsToFfmpegTime(start),
      durationSeconds,
      durationTime:
        durationSeconds !== null ? secondsToFfmpegTime(durationSeconds) : null,
    };
  });
}

async function convertCueFileToTrackSheet(
  cueFile: File,
  options?: { totalDurationSeconds?: number },
) {
  const content = await cueFile.text();

  const cueSheet = parseCueText(content);
  const trackSheet = buildTrackSheet(
    cueSheet,
    options?.totalDurationSeconds || 0,
  );

  const splitPlan = buildSplitPlan(cueSheet, options?.totalDurationSeconds);

  return { cueSheet, trackSheet, splitPlan };
}

function validateCueAgainstDuration(
  splitPlan: TrackSplitPlan[],
  audioDurationSeconds: number,
  options?: {
    toleranceSeconds?: number;
    minTrackSeconds?: number;
  },
): CueValidationResult {
  const tolerance = options?.toleranceSeconds ?? 2;
  const minTrack = options?.minTrackSeconds ?? 1;

  const errors: string[] = [];

  if (splitPlan.length === 0) {
    errors.push("CUE tidak memiliki track yang valid.");
    return { ok: false, errors };
  }

  const last = splitPlan[splitPlan.length - 1];

  if (last.endSeconds == null) {
    errors.push(
      "Track terakhir tidak memiliki end time (mungkin durasi audio tidak diketahui).",
    );
  } else {
    const diff = Math.abs(audioDurationSeconds - last.endSeconds);
    if (diff > tolerance) {
      errors.push(
        `Durasi audio (${audioDurationSeconds.toFixed(
          2,
        )}s) tidak cocok dengan CUE (≈${last.endSeconds.toFixed(
          2,
        )}s). Selisih ${diff.toFixed(2)}s.`,
      );
    }
  }

  for (const t of splitPlan) {
    if (t.durationSeconds != null && t.durationSeconds < minTrack) {
      errors.push(
        `Track ${t.track} memiliki durasi sangat pendek (${t.durationSeconds.toFixed(
          2,
        )}s).`,
      );
    }
    if (t.startSeconds >= audioDurationSeconds - tolerance) {
      errors.push(
        `Track ${t.track} mulai di luar/ujung file audio (start ${t.startSeconds.toFixed(
          2,
        )}s, durasi audio ${audioDurationSeconds.toFixed(2)}s).`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export {
  validateCueAgainstDuration,
  parseCueText,
  convertCueFileToTrackSheet,
  getAudioDurationFromFile,
};

export type {
  CueTrack,
  CueSheet,
  TrackSheetRow,
  TrackSplitPlan,
  CueValidationResult,
};
