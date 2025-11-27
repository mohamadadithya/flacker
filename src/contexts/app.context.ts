import React, { createContext, useContext, type RefObject } from "react";
import { type CueSheet, type TrackSheetRow } from "../lib/cue-converter";

interface AlbumInfo extends Pick<CueSheet, "performer"> {
  name: string;
}

const AppContext = createContext<{
  trackSheet: TrackSheetRow[];
  setTrackSheet: (newTrackSheet: TrackSheetRow[]) => void;
  tracksTableRef: RefObject<HTMLDivElement | null>;
  albumInfo: AlbumInfo;
  setAlbumInfo: (newAlbumInfo: AlbumInfo) => void;
}>({
  trackSheet: [],
  setTrackSheet: () => {},
  tracksTableRef: React.createRef<HTMLDivElement>(),
  albumInfo: {
    name: "",
    performer: "",
  },
  setAlbumInfo: () => {},
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
