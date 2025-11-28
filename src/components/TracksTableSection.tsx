import type React from "react";
import { useAppContext } from "../contexts/app.context";
import Container from "./Container";
import ArrowRight from "~icons/mdi/arrow-right";
import { useEffect, useRef, useState } from "react";
import {
  PHASE_TEXT,
  splitAudioToTracks,
  STEP_TEXT,
  type SplitProgress,
  type SplitUIState,
} from "../lib/splitter";
import { downloadBlob } from "../helpers";

export default function TracksTableSection() {
  const {
    trackSheet,
    setTrackSheet,
    tracksTableRef,
    albumInfo: { name: albumName, performer, coverSrc },
    ffmpegHook,
    appFormHook,
  } = useAppContext();

  const HEADERS = ["No", "Title", "Performer", "Duration"];
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);

  function handleSelectTrack(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked, value } = event.target;
    const trackNo = parseInt(value);

    if (checked) {
      setSelectedTracks([...selectedTracks, trackNo]);
    } else {
      setSelectedTracks(selectedTracks.filter((no) => no !== trackNo));
    }
  }

  const { ffmpeg } = ffmpegHook;

  const [splitState, setSplitState] = useState<SplitUIState>({
    status: "idle",
    done: 0,
    total: 0,
  });

  const processModalRef = useRef<HTMLDialogElement | null>(null);

  async function handleDownload() {
    if (!appFormHook) return;

    const { getValues } = appFormHook;

    const audioFile = getValues("audioFile");
    const cueFile = getValues("cueFile");
    const albumCover = getValues("albumCover");

    const { zipBlob } = await splitAudioToTracks(ffmpeg, audioFile, cueFile, {
      albumCover,
      selectedTracks,
      silentLog: true,
      onProgress: (ev: SplitProgress) => {
        const { status, phase, step, track, done, total, etaSeconds } = ev;

        setSplitState((prev) => ({
          ...prev,
          status:
            status === "processing"
              ? phase === "zipping"
                ? "zipping"
                : "processing"
              : status,
          phase,
          step,
          currentTrackTitle:
            phase === "processing" && track
              ? (track.title ?? `Track ${track.track}`)
              : prev.currentTrackTitle,
          done,
          total,
          etaSeconds: status === "processing" ? etaSeconds : null,
        }));
      },
    });

    downloadBlob(zipBlob, audioFile.name);
  }

  useEffect(() => {
    if (["processing", "zipping"].includes(splitState.status)) {
      processModalRef.current?.showModal();
    } else if (splitState.status === "done") {
      processModalRef.current?.close();
    }
  });

  return (
    <section
      className="min-h-dvh grid place-items-center py-10"
      ref={tracksTableRef}
    >
      <Container>
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-5 flex items-center gap-3">
            <img
              src={coverSrc}
              alt={albumName}
              className="size-28 sm:size-32 aspect-square object-cover object-center"
              crossOrigin="anonymous"
            />
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
                {albumName}
              </h2>
              <p className="text-sm sm:text-base">
                by <span className="text-primary">{performer}</span>
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-xs sm:table-sm md:table-md table-pin-rows table-pin-cols">
              <thead>
                <tr>
                  <th></th>
                  {HEADERS.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackSheet.map(({ no, title, performer, duration }, id) => {
                  const isChecked = selectedTracks.includes(no);

                  return (
                    <tr key={no}>
                      <th>
                        <Checkbox
                          checked={isChecked}
                          onChange={handleSelectTrack}
                          value={no}
                        />
                      </th>
                      <td>{id + 1}</td>
                      <td>{title}</td>
                      <td>{performer}</td>
                      <td>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divider my-3"></div>
          <div className="flex items-center justify-between flex-col-reverse sm:flex-row gap-4">
            <div className="flex-1 text-sm sm:text-base">
              <p>{trackSheet.length} tracks</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTrackSheet([])}
                type="button"
                className="btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                type="button"
                className="btn btn-primary"
              >
                {selectedTracks.length > 0
                  ? `Download Selected ${selectedTracks.length === 1 ? "Track" : "Tracks"}`
                  : `Download ${trackSheet.length === 1 ? "Track" : "All Tracks"}`}
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </Container>
      <dialog ref={processModalRef} className="modal">
        <div className="modal-box space-y-2 text-sm">
          <p className="font-semibold text-lg">
            {PHASE_TEXT[splitState.phase!]}
          </p>

          {splitState.phase !== "processing" ? (
            <p>{splitState.step ? STEP_TEXT[splitState.step] : ""}</p>
          ) : null}

          {splitState.phase === "processing" &&
            splitState.currentTrackTitle && (
              <div className="flex items-center justify-between gap-4">
                <p>
                  Splitting Track: <b>{splitState.currentTrackTitle}</b>
                </p>
                <p>
                  {splitState.done}/{splitState.total}
                </p>
              </div>
            )}

          {splitState.phase === "processing" ? (
            <progress
              className="progress w-full progress-primary"
              value={splitState.done}
              max={splitState.total}
            ></progress>
          ) : (
            <progress className="progress w-full"></progress>
          )}
        </div>
      </dialog>
    </section>
  );
}

function Checkbox({ ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      <input
        type="checkbox"
        className="checkbox checkbox-xs sm:checkbox-sm md:checkbox-md"
        {...rest}
      />
    </label>
  );
}
