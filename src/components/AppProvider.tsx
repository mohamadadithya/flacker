"use client";

import { useRef, useState } from "react";
import type { TrackSheetRow } from "../lib/cue-converter";
import { AppContext, type AlbumInfo } from "../contexts/app.context";

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [trackSheet, setTrackSheet] = useState<TrackSheetRow[]>([]);
  const tracksTableRef = useRef<HTMLDivElement>(null);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo>({
    name: "",
    performer: "",
  });

  return (
    <AppContext.Provider
      value={{
        trackSheet,
        setTrackSheet,
        tracksTableRef,
        albumInfo,
        setAlbumInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
