import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import JSZip from "jszip";
import {
  convertCueFileToTrackSheet,
  validateCueAgainstDuration,
  type TrackSplitPlan,
} from "./cue-converter";

export interface SplitResult {
  zipBlob: Blob;
  tracks: {
    name: string;
    blob: Blob;
    plan: TrackSplitPlan;
  }[];
}

export async function splitAudioToTracks(
  ffmpeg: FFmpeg,
  sourceFile: File,
  cueFile: File,
): Promise<SplitResult> {
  const inputName = sanitizeFileName(sourceFile.name || "audio");
  await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

  const audioDurationSeconds = await getAudioDurationSeconds(ffmpeg, inputName);

  const { cueSheet, splitPlan } = await convertCueFileToTrackSheet(cueFile, {
    totalDurationSeconds: audioDurationSeconds,
  });

  if (splitPlan.length === 0) {
    throw new Error("CUE tidak memiliki INDEX 01 yang valid.");
  }

  const validation = validateCueAgainstDuration(
    splitPlan,
    audioDurationSeconds,
    {
      toleranceSeconds: 2,
      minTrackSeconds: 1,
    },
  );

  if (!validation.ok) {
    throw new Error(
      `Audio tidak cocok dengan CUE:\n${validation.errors.join("\n")}`,
    );
  }

  const zip = new JSZip();
  const outputs: SplitResult["tracks"] = [];
  const outputMime = "audio/flac";
  const outputExt = "flac";

  const totalTracks = splitPlan.length;
  const album = cueSheet.album ?? "";
  const albumArtist = cueSheet.performer ?? "";

  for (const track of splitPlan) {
    const safeTitle = sanitizeFileName(track.title ?? `Track ${track.track}`);
    const outName = `${String(track.track).padStart(2, "0")} - ${safeTitle}.${outputExt}`;

    const trackArtist =
      (track as { performer?: string }).performer ?? albumArtist;

    const metadataArgs = buildMetadataArgs({
      album,
      albumArtist,
      trackArtist,
      title: safeTitle,
      trackNo: track.track,
      totalTracks,
    });

    const args: string[] = [
      "-ss",
      track.startTime,
      "-i",
      inputName,
      ...(track.durationTime ? ["-t", track.durationTime] : []),
      "-vn",
      "-map_metadata",
      "-1",
      "-c:a",
      "flac",
      ...metadataArgs,
      outName,
    ];

    console.log("[ffmpeg]", args.join(" "));
    await ffmpeg.exec(args);

    const fileData = await ffmpeg.readFile(outName);
    if (!(fileData instanceof Uint8Array)) {
      throw new Error(
        `ffmpeg.readFile(${outName}) tidak mengembalikan Uint8Array`,
      );
    }

    const uint8 = Uint8Array.from(fileData);
    const blob = new Blob([uint8], { type: outputMime });

    zip.file(outName, uint8);

    outputs.push({
      name: outName,
      blob,
      plan: track,
    });
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });

  return { zipBlob, tracks: outputs };
}

async function getAudioDurationSeconds(
  ffmpeg: FFmpeg,
  inputName: string,
): Promise<number> {
  let duration: number | null = null;

  const logger = (e: { type: string; message: string }) => {
    const match = e.message.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);

    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
  };

  ffmpeg.on("log", logger);

  await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]);

  if (duration == null) {
    throw new Error("Tidak bisa membaca durasi audio dari ffmpeg log.");
  }

  return duration;
}

function buildMetadataArgs(opts: {
  album: string;
  albumArtist: string;
  trackArtist: string;
  title: string;
  trackNo: number;
  totalTracks: number;
}): string[] {
  const args: string[] = [];

  if (opts.album) {
    args.push("-metadata", `album=${opts.album}`);
  }
  if (opts.albumArtist) {
    args.push("-metadata", `album_artist=${opts.albumArtist}`);
  }
  if (opts.trackArtist) {
    args.push("-metadata", `artist=${opts.trackArtist}`);
  }
  args.push("-metadata", `title=${opts.title}`);
  args.push("-metadata", `track=${opts.trackNo}/${opts.totalTracks}`);

  return args;
}

function sanitizeFileName(str: string): string {
  return str.replace(/[<>:"/\\|?*]+/g, "_").trim();
}
