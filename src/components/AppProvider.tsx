"use client";

import { useRef, useState } from "react";
import type { TrackSheetRow } from "../lib/cue-converter";
import { AppContext } from "../contexts/app.context";

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [trackSheet, setTrackSheet] = useState<TrackSheetRow[]>([]);
  const tracksTableRef = useRef<HTMLDivElement>(null);

  return (
    <AppContext.Provider value={{ trackSheet, setTrackSheet, tracksTableRef }}>
      {children}
    </AppContext.Provider>
  );
}
