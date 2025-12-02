import { createContext, createRef, useContext, type RefObject } from "react";
import { type CueSheet, type TrackSheetRow } from "../lib/cue-converter";
import type { useFFmpeg } from "../hooks/ffmpeg.hook";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { type UseFormReturn } from "react-hook-form";
import type { AppFormData } from "../schema/app.schema";

interface AlbumInfo extends Pick<CueSheet, "performer"> {
  name: string;
  coverSrc: string;
  date: string;
  genre: string;
}

const AppContext = createContext<{
  trackSheet: TrackSheetRow[];
  setTrackSheet: (newTrackSheet: TrackSheetRow[]) => void;
  tracksTableRef: RefObject<HTMLDivElement | null>;
  albumInfo: AlbumInfo;
  setAlbumInfo: (newAlbumInfo: AlbumInfo) => void;
  ffmpegHook: ReturnType<typeof useFFmpeg>;
  appFormHook: UseFormReturn<AppFormData> | undefined;
  appFormRef: RefObject<HTMLFormElement | null>;
}>({
  trackSheet: [],
  setTrackSheet: () => {},
  tracksTableRef: createRef<HTMLDivElement>(),
  albumInfo: {
    name: "",
    performer: "",
    date: "",
    coverSrc: "",
    genre: "",
  },
  ffmpegHook: {
    ffmpeg: new FFmpeg(),
    isLoaded: false,
    error: null,
  },
  setAlbumInfo: () => {},
  appFormHook: undefined,
  appFormRef: createRef<HTMLFormElement | null>(),
});

function useAppContext() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return ctx;
}

export { AppContext, useAppContext };
export type { AlbumInfo };
