import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type CueSheet = {
  /** From `FILE "source.flac"` (optional, sometimes missing in user-made CUE) */
  file?: string;

  /** Album metadata — global TITLE before any TRACK appears */
  album?: string;

  /** Album-level performer (band, artist, etc.) */
  performer?: string;

  /** REM DATE — year or YYYY-MM-DD parsed as string */
  date?: string;

  /** REM GENRE */
  genre?: string;

  /** REM CATALOG — useful for tagging FLAC metadata */
  catalog?: string;

  /** REM COMMENT — general notes */
  comment?: string;

  /** REM DISCNUMBER — 1 for disc 1/2/3… */
  discNumber?: number;

  /** REM DISCTOTAL if provided */
  totalDiscs?: number;

  /** Parsed track list */
  tracks: CueTrack[];
};

type CueTrack = {
  /** Track number (01, 02, 03…) */
  track: number;

  /** Track title: TITLE "xxxx" */
  title?: string;

  /** Track-level performer override — if absent, use album performer */
  performer?: string;

  /** INDEX 01 time reference */
  index?: string;

  /** Optional: track-specific DATE (rare) */
  date?: string;

  /** Optional: track-level genre override (rare) */
  genre?: string;
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

function extractUnquotedAfter(
  prefix: string,
  line: string,
): string | undefined {
  const quoted = line.match(new RegExp(`${prefix}\\s+"([^"]+)"`, "i"));
  if (quoted) return quoted[1];

  return line
    .replace(new RegExp(`${prefix}\\s+`, "i"), "")
    .replace(/"/g, "")
    .trim();
}

function parseCueText(text: string): CueSheet {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const sheet: CueSheet = { tracks: [] };
  let currentTrack: CueTrack | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("REM COMMENT")) continue;

    if (line.startsWith("REM DATE")) {
      sheet.date = extractUnquotedAfter("REM DATE", line);
      continue;
    }
    if (line.startsWith("REM GENRE")) {
      sheet.genre = extractUnquotedAfter("REM GENRE", line);
      continue;
    }
    if (line.startsWith("REM CATALOG")) {
      sheet.catalog = extractUnquotedAfter("REM CATALOG", line);
      continue;
    }
    if (line.startsWith("REM COMMENT")) {
      sheet.comment = extractUnquotedAfter("REM COMMENT", line);
      continue;
    }
    if (line.startsWith("REM DISCNUMBER")) {
      const val = extractUnquotedAfter("REM DISCNUMBER", line);
      sheet.discNumber = val ? Number(val) : undefined;
      continue;
    }
    if (line.startsWith("REM DISCTOTAL")) {
      const val = extractUnquotedAfter("REM DISCTOTAL", line);
      sheet.totalDiscs = val ? Number(val) : undefined;
      continue;
    }

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
      if (!currentTrack) sheet.album = value ?? sheet.album;
      else currentTrack.title = value ?? currentTrack.title;
      continue;
    }

    if (line.startsWith("PERFORMER")) {
      const value = extractQuoted(line);
      if (!currentTrack) sheet.performer = value ?? sheet.performer;
      else currentTrack.performer = value ?? currentTrack.performer;
      continue;
    }

    if (line.startsWith("INDEX 01") && currentTrack) {
      const match = line.match(/INDEX 01\s+(\S+)/);
      if (match) currentTrack.index = match[1];
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
  const s = seconds.toFixed(3).padStart(6, "0");

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

  if (duration == null) {
    throw new Error("Unable to read audio duration from ffmpeg.");
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
  const content = await readCueFileSmart(cueFile);

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
    errors.push("CUE does not have a valid track.");
    return { ok: false, errors };
  }

  const last = splitPlan[splitPlan.length - 1];

  if (last.endSeconds == null) {
    errors.push(
      "The last track does not have an end time (perhaps the audio duration is unknown).",
    );
  } else {
    const diff = Math.abs(audioDurationSeconds - last.endSeconds);
    if (diff > tolerance) {
      errors.push(
        `Audio duration (${audioDurationSeconds.toFixed(
          2,
        )}s) not compatible with CUE (≈${last.endSeconds.toFixed(
          2,
        )}s). difference ${diff.toFixed(2)}s.`,
      );
    }
  }

  for (const t of splitPlan) {
    if (t.durationSeconds != null && t.durationSeconds < minTrack) {
      errors.push(
        `Track ${t.track} has a very short duration (${t.durationSeconds.toFixed(
          2,
        )}s).`,
      );
    }
    if (t.startSeconds >= audioDurationSeconds - tolerance) {
      errors.push(
        `Track ${t.track} starts at the beginning/end of the audio file (start ${t.startSeconds.toFixed(
          2,
        )}s, audio duration ${audioDurationSeconds.toFixed(2)}s).`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

async function readCueFileSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();

  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  const replacementCountUtf8 = (utf8Text.match(/\uFFFD/g) ?? []).length;

  if (replacementCountUtf8 === 0) {
    return utf8Text.normalize("NFC");
  }

  const win1252Text = new TextDecoder("windows-1252", {
    fatal: false,
  }).decode(buf);
  const replacementCountWin = (win1252Text.match(/\uFFFD/g) ?? []).length;

  const best =
    replacementCountWin < replacementCountUtf8 ? win1252Text : utf8Text;

  return best.normalize("NFC");
}

export {
  validateCueAgainstDuration,
  parseCueText,
  convertCueFileToTrackSheet,
  getAudioDurationFromFile,
  readCueFileSmart,
};

export type {
  CueTrack,
  CueSheet,
  TrackSheetRow,
  TrackSplitPlan,
  CueValidationResult,
};
