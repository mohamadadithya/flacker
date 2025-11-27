"use client";

import { useState } from "react";
import type { TrackSheetRow } from "../lib/cue-converter";
import { AppContext } from "../contexts/app.context";

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [trackSheet, setTrackSheet] = useState<TrackSheetRow[]>([]);

  return (
    <AppContext.Provider value={{ trackSheet, setTrackSheet }}>
      {children}
    </AppContext.Provider>
  );
}
