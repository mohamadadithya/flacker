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

type SplitOptions = {
  albumCover?: File | null | string | URL;
  selectedTracks?: number[];
};

// ---- 640px downscale ----
async function downscaleImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const maxSize = 640;
  const { width, height } = bitmap;
  const scale = Math.min(maxSize / width, maxSize / height, 1);

  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );

  if (!blob) throw new Error("Failed to generate downscaled image");

  return new File([blob], "cover-640.jpg", { type: "image/jpeg" });
}

async function resolveAlbumCoverFile(
  albumCover: SplitOptions["albumCover"],
): Promise<File | null> {
  if (!albumCover) return null;

  if (albumCover instanceof File) {
    return downscaleImage(albumCover);
  }

  const url = albumCover instanceof URL ? albumCover.toString() : albumCover;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch album cover from URL: ${url}`);
  }

  const blob = await res.blob();
  const fetched = new File([blob], "cover-original", { type: blob.type });

  return downscaleImage(fetched);
}

export async function splitAudioToTracks(
  ffmpeg: FFmpeg,
  sourceFile: File,
  cueFile: File,
  options?: SplitOptions,
): Promise<SplitResult> {
  const inputName = sanitizeFileName(sourceFile.name || "audio");
  await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

  let coverInputName: string | null = null;

  if (options?.albumCover) {
    const coverFile = await resolveAlbumCoverFile(options.albumCover);

    if (coverFile) {
      const originalName = coverFile.name || "cover.jpg";
      const hasExt = /\.[a-zA-Z0-9]+$/.test(originalName);
      const safeName = sanitizeFileName(
        hasExt ? originalName : `${originalName}.jpg`,
      );

      coverInputName = safeName;
      await ffmpeg.writeFile(coverInputName, await fetchFile(coverFile));
    }
  }

  const audioDurationSeconds = await getAudioDurationSeconds(ffmpeg, inputName);

  const { cueSheet, splitPlan } = await convertCueFileToTrackSheet(cueFile, {
    totalDurationSeconds: audioDurationSeconds,
  });

  if (splitPlan.length === 0) {
    throw new Error("CUE does not have a valid INDEX 01.");
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
      `Audio does not match CUE:\n${validation.errors.join("\n")}`,
    );
  }

  const fullPlan = splitPlan;
  const totalTracks = fullPlan.length;

  const effectivePlan =
    options?.selectedTracks && options.selectedTracks.length > 0
      ? fullPlan.filter((t) => options.selectedTracks!.includes(t.track))
      : fullPlan;

  if (effectivePlan.length === 0) {
    throw new Error(
      `The selected track was not found in CUE. Valid number: ${fullPlan
        .map((t) => t.track)
        .join(", ")}`,
    );
  }

  const zip = new JSZip();
  const outputs: SplitResult["tracks"] = [];
  const outputMime = "audio/flac";
  const outputExt = "flac";

  const album = cueSheet.album ?? "";
  const albumArtist = cueSheet.performer ?? "";

  for (const track of effectivePlan) {
    const safeTitle = sanitizeFileName(track.title ?? `Track ${track.track}`);
    const baseOutName = `${String(track.track).padStart(
      2,
      "0",
    )} - ${safeTitle}`;
    const outName = `${baseOutName}.${outputExt}`;
    const tempName = `${baseOutName}.tmp.${outputExt}`;

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

    //
    // PASS 1: split audio -> tempName
    //
    const splitArgs: string[] = [
      "-i",
      inputName,
      "-ss",
      track.startTime,
      ...(track.durationTime ? ["-t", track.durationTime] : []),
      "-map_metadata",
      "-1",
      "-vn",
      "-c:a",
      "flac",
      "-compression_level",
      "12",
      ...metadataArgs,
      tempName,
    ];

    console.log("[ffmpeg] split", splitArgs.join(" "));
    await ffmpeg.exec(splitArgs);

    //
    // PASS 2: if there is a cover -> paste the cover into tempName -> outName
    //         if there is no cover -> immediately rename logically (copy file)
    //
    if (coverInputName) {
      const coverArgs: string[] = [
        "-i",
        tempName,
        "-i",
        coverInputName,
        "-map_metadata",
        "0",
        "-map",
        "0:a",
        "-map",
        "1:v",
        "-c:a",
        "copy",
        "-c:v",
        "copy",
        "-disposition:v:0",
        "attached_pic",
        "-metadata:s:v",
        "title=Album cover",
        "-metadata:s:v",
        "comment=Cover (front)",
        outName,
      ];

      console.log("[ffmpeg] attach cover", coverArgs.join(" "));
      await ffmpeg.exec(coverArgs);
    } else {
      // if there is no cover: tempName is final, just “rename” logically
      // (in FS ffmpeg we can: read tempName -> write as outName)
      const tempData = await ffmpeg.readFile(tempName);
      await ffmpeg.writeFile(outName, tempData);
    }

    const fileData = await ffmpeg.readFile(outName);
    if (!(fileData instanceof Uint8Array)) {
      throw new Error(
        `ffmpeg.readFile(${outName}) does not return a Uint8Array`,
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

    // optional cleanup if your ffmpeg wrapper has deleteFile():
    // await ffmpeg.deleteFile(tempName);
    // (and later, if you want: delete coverInputName outside the loop after finishing)
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
    throw new Error("Unable to read audio duration from ffmpeg log.");
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
