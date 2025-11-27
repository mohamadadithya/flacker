import { createContext, useContext } from "react";
import { type TrackSheetRow } from "../lib/cue-converter";

const AppContext = createContext<{
  trackSheet: TrackSheetRow[];
  setTrackSheet: (newTrackSheet: TrackSheetRow[]) => void;
}>({
  trackSheet: [],
  setTrackSheet: () => {},
});

function useAppContext() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return ctx;
}

export { AppContext, useAppContext };
