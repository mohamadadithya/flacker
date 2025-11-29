import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import JSZip from "jszip";
import {
  convertCueFileToTrackSheet,
  validateCueAgainstDuration,
  type TrackSplitPlan,
} from "./cue-converter";
import type { AlbumInfoFormData } from "../schema/album-info.schema";

export interface SplitResult {
  zipBlob?: Blob;
  file?: Blob;
  fileName?: string;
  tracks: {
    name: string;
    blob: Blob;
    plan: TrackSplitPlan;
  }[];
}

type SplitProgressStatus = "processing" | "zipping" | "done";

type SplitPhase =
  | "init"
  | "prepareInput"
  | "prepareCover"
  | "analyzeAudio"
  | "buildPlan"
  | "processing"
  | "zipping"
  | "done";

type SplitStep =
  | "writeInput"
  | "resolveCover"
  | "writeCover"
  | "probeDuration"
  | "convertCue"
  | "validatePlan"
  | "trackSplit"
  | "attachCover"
  | "copyNoCover"
  | "readOutput"
  | "zipGenerate"
  | "singleTrackReturn";

export type SplitProgress = {
  status: SplitProgressStatus;
  phase?: SplitPhase;
  step?: SplitStep;
  track?: TrackSplitPlan;
  done: number;
  total: number;
  etaSeconds: number;
};

export type SplitOptions = {
  albumCover?: File | null | string | URL;
  selectedTracks?: number[];
  onProgress?: (event: SplitProgress) => void;
  silentLog?: boolean;
  albumInfo?: AlbumInfoFormData;
};

export type SplitUIState = {
  status: "idle" | "processing" | "zipping" | "done";
  phase?: SplitPhase;
  step?: SplitStep;
  currentTrackTitle?: string;
  done: number;
  total: number;
  etaSeconds?: number | null;
};

function sanitizeFileName(str: string): string {
  return str.replace(/[<>:"/\\|?*]+/g, "_").trim();
}

function buildMetadataArgs(opts: {
  album: string;
  albumArtist: string;
  trackArtist: string;
  title: string;
  trackNo: number;
  totalTracks: number;
  releaseDate: string;
  genre: string;
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

  if (opts.releaseDate) {
    args.push("-metadata", `date=${opts.releaseDate}`);
  }

  if (opts.genre) {
    args.push("-metadata", `genre=${opts.genre}`);
  }

  args.push("-metadata", `title=${opts.title}`);
  args.push("-metadata", `track=${opts.trackNo}/${opts.totalTracks}`);

  return args;
}

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

function normalizeTrackTitle(raw: string): string {
  return raw.replace(/\uFFFD/g, "'").normalize("NFC");
}

export async function splitAudioToTracks(
  ffmpeg: FFmpeg,
  sourceFile: File,
  cueFile: File,
  options?: SplitOptions,
): Promise<SplitResult> {
  const { onProgress, silentLog, albumInfo } = options ?? {};

  let totalToProcess = 0;
  let timeStart = performance.now();

  const emit = (partial: {
    status: SplitProgressStatus;
    phase?: SplitPhase;
    step?: SplitStep;
    track?: TrackSplitPlan;
    done?: number;
    etaSeconds?: number;
  }) => {
    if (!onProgress) return;
    const done = partial.done ?? 0;
    const eta = partial.etaSeconds ?? 0;

    onProgress({
      status: partial.status,
      phase: partial.phase,
      step: partial.step,
      track: partial.track,
      done,
      total: totalToProcess,
      etaSeconds: eta,
    });
  };

  emit({
    status: "processing",
    phase: "prepareInput",
    step: "writeInput",
    done: 0,
  });

  const inputName = sanitizeFileName(sourceFile.name || "audio");
  await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

  let coverInputName: string | null = null;

  if (options?.albumCover) {
    emit({
      status: "processing",
      phase: "prepareCover",
      step: "resolveCover",
      done: 0,
    });

    const coverFile = await resolveAlbumCoverFile(options.albumCover);

    if (coverFile) {
      const originalName = coverFile.name || "cover.jpg";
      const hasExt = /\.[a-zA-Z0-9]+$/.test(originalName);
      const safeName = sanitizeFileName(
        hasExt ? originalName : `${originalName}.jpg`,
      );

      coverInputName = safeName;

      emit({
        status: "processing",
        phase: "prepareCover",
        step: "writeCover",
        done: 0,
      });

      await ffmpeg.writeFile(coverInputName, await fetchFile(coverFile));
    }
  }

  emit({
    status: "processing",
    phase: "analyzeAudio",
    step: "probeDuration",
    done: 0,
  });

  const albumDuration = await getAudioDurationSeconds(ffmpeg, inputName);

  emit({
    status: "processing",
    phase: "buildPlan",
    step: "convertCue",
    done: 0,
  });

  const { cueSheet, splitPlan } = await convertCueFileToTrackSheet(
    cueFile,
    albumDuration,
  );

  if (splitPlan.length === 0) {
    throw new Error("CUE does not have a valid INDEX 01.");
  }

  emit({
    status: "processing",
    phase: "buildPlan",
    step: "validatePlan",
    done: 0,
  });

  const validation = validateCueAgainstDuration(splitPlan, albumDuration, {
    toleranceSeconds: 2,
    minTrackSeconds: 1,
  });

  if (!validation.ok) {
    throw new Error(
      `Audio does not match CUE:\n${validation.errors.join("\n")}`,
    );
  }

  const fullPlan = splitPlan;
  const totalTracksInAlbum = fullPlan.length;

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

  const album = albumInfo?.albumName || cueSheet.album || "";
  const albumArtist = albumInfo?.performer || cueSheet.performer || "";
  const releaseDate = albumInfo?.releaseDate || cueSheet.date || "";
  const genre = albumInfo?.genre || cueSheet.genre || "";

  totalToProcess = effectivePlan.length;
  timeStart = performance.now();

  for (const [index, track] of effectivePlan.entries()) {
    const doneBefore = index;

    let etaBefore = 0;
    if (doneBefore > 0) {
      const elapsed = (performance.now() - timeStart) / 1000;
      const avgPerTrack = elapsed / doneBefore;
      const remaining = totalToProcess - doneBefore;
      etaBefore = Math.max(0, Math.round(avgPerTrack * remaining));
    }

    emit({
      status: "processing",
      phase: "processing",
      step: "trackSplit",
      track,
      done: doneBefore,
      etaSeconds: etaBefore,
    });

    const rawTitle = track.title ?? `Track ${track.track}`;
    const normalizedTitle = normalizeTrackTitle(rawTitle);

    const safeTitle = sanitizeFileName(normalizedTitle);
    const baseOutName = `${String(track.track).padStart(2, "0")} - ${safeTitle}`;
    const outName = `${baseOutName}.${outputExt}`;
    const tempName = `${baseOutName}.tmp.${outputExt}`;

    const trackArtist =
      (track as { performer?: string }).performer ?? albumArtist;

    const metadataArgs = buildMetadataArgs({
      album,
      albumArtist,
      trackArtist,
      title: normalizedTitle,
      trackNo: track.track,
      totalTracks: totalTracksInAlbum,
      releaseDate,
      genre,
    });

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
      "5",
      ...metadataArgs,
      tempName,
    ];

    if (!silentLog) console.log("[ffmpeg] split", splitArgs.join(" "));
    await ffmpeg.exec(splitArgs);

    if (coverInputName) {
      emit({
        status: "processing",
        phase: "processing",
        step: "attachCover",
        track,
        done: doneBefore,
        etaSeconds: etaBefore,
      });

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

      if (!silentLog) console.log("[ffmpeg] attach cover", coverArgs.join(" "));
      await ffmpeg.exec(coverArgs);
    } else {
      emit({
        status: "processing",
        phase: "processing",
        step: "copyNoCover",
        track,
        done: doneBefore,
        etaSeconds: etaBefore,
      });

      const tempData = await ffmpeg.readFile(tempName);
      await ffmpeg.writeFile(outName, tempData);
    }

    emit({
      status: "processing",
      phase: "processing",
      step: "readOutput",
      track,
      done: doneBefore,
      etaSeconds: etaBefore,
    });

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

    const doneNow = index + 1;

    const elapsedNow = (performance.now() - timeStart) / 1000;
    const avgNow = elapsedNow / doneNow;
    const remainingNow = totalToProcess - doneNow;
    const etaNow =
      remainingNow > 0 ? Math.max(0, Math.round(avgNow * remainingNow)) : 0;

    emit({
      status: "processing",
      phase: "processing",
      step: "trackSplit",
      track,
      done: doneNow,
      etaSeconds: etaNow,
    });
  }

  if (outputs.length === 1) {
    const only = outputs[0];

    emit({
      status: "done",
      phase: "done",
      step: "singleTrackReturn",
      track: only.plan,
      done: totalToProcess,
      etaSeconds: 0,
    });

    return {
      file: only.blob,
      fileName: only.name,
      tracks: outputs,
    };
  }

  emit({
    status: "zipping",
    phase: "zipping",
    step: "zipGenerate",
    done: totalToProcess,
    etaSeconds: 0,
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });

  emit({
    status: "done",
    phase: "done",
    step: "zipGenerate",
    done: totalToProcess,
    etaSeconds: 0,
  });

  return { zipBlob, tracks: outputs };
}

export const PHASE_TEXT: Record<SplitPhase, string> = {
  init: "Preparing…",
  prepareInput: "Loading audio source…",
  prepareCover: "Processing album cover…",
  analyzeAudio: "Analyzing audio duration…",
  buildPlan: "Generating split plan…",
  processing: "Splitting tracks…",
  zipping: "Creating ZIP archive…",
  done: "Completed!",
};

export const STEP_TEXT: Record<SplitStep, string> = {
  writeInput: "Importing audio file…",
  resolveCover: "Fetching album cover…",
  writeCover: "Saving optimized cover…",
  probeDuration: "Reading track duration…",
  convertCue: "Parsing cue sheet…",
  validatePlan: "Validating cues against audio…",
  trackSplit: "Splitting FLAC track…",
  attachCover: "Embedding cover image…",
  copyNoCover: "Writing final track file…",
  readOutput: "Retrieving processed track…",
  zipGenerate: "Building ZIP package…",
  singleTrackReturn: "Exporting single track…",
};
