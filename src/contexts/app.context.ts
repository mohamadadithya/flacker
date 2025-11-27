import React, { createContext, useContext, type RefObject } from "react";
import { type TrackSheetRow } from "../lib/cue-converter";

const AppContext = createContext<{
  trackSheet: TrackSheetRow[];
  setTrackSheet: (newTrackSheet: TrackSheetRow[]) => void;
  tracksTableRef: RefObject<HTMLDivElement | null>;
}>({
  trackSheet: [],
  setTrackSheet: () => {},
  tracksTableRef: React.createRef<HTMLDivElement>(),
});

function useAppContext() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return ctx;
}

export { AppContext, useAppContext };
