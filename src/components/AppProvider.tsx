"use client";

import { useRef, useState } from "react";
import type { TrackSheetRow } from "../lib/cue-converter";
import { AppContext, type AlbumInfo } from "../contexts/app.context";
import { useFFmpeg } from "../hooks/ffmpeg.hook";
import { useForm } from "react-hook-form";
import { appFormSchema, type AppFormData } from "../schema/app.schema";
import { zodResolver } from "@hookform/resolvers/zod/src/zod.js";

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
    date: "",
    genre: "",
    coverSrc: "",
  });

  const ffmpegHook = useFFmpeg();
  const appFormHook = useForm<AppFormData>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      audioFile: undefined,
      cueFile: undefined,
      albumCover: undefined,
    },
  });

  return (
    <AppContext.Provider
      value={{
        trackSheet,
        setTrackSheet,
        tracksTableRef,
        albumInfo,
        setAlbumInfo,
        ffmpegHook,
        appFormHook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
