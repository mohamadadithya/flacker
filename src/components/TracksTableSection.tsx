import type React from "react";
import { useAppContext } from "../contexts/app.context";
import Container from "./Container";
import ArrowRight from "~icons/mdi/arrow-right";
import { useEffect, useRef, useState } from "react";
import {
  splitAudioToTracks,
  type SplitProgress,
  type SplitUIState,
} from "../lib/splitter";
import { downloadBlob } from "../helpers";
import AutosizeInput from "react-input-autosize";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  albumInfoSchema,
  type AlbumInfoFormData,
} from "../schema/album-info.schema";
import ProcessModal from "./ProcessModal";

export default function TracksTableSection() {
  const {
    trackSheet,
    setTrackSheet,
    tracksTableRef,
    albumInfo: {
      name: albumName,
      performer,
      coverSrc,
      date: releaseDate,
      genre,
    },
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
  const {
    control,
    formState: { errors },
    getValues: getAlbumFormValues,
  } = useForm<AlbumInfoFormData>({
    resolver: zodResolver(albumInfoSchema),
    defaultValues: {
      albumName: albumName || "",
      performer: performer || "",
      releaseDate: releaseDate || "",
      genre: genre || "",
    },
    mode: "onChange",
  });

  async function handleDownload() {
    if (!appFormHook) return;

    const { getValues: getAppFormValues } = appFormHook;
    const { audioFile, cueFile, albumCover } = getAppFormValues();
    const albumInfoValues = getAlbumFormValues();

    const result = await splitAudioToTracks(ffmpeg, audioFile, cueFile, {
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
              ? `${String(track.track).padStart(2, "0")} - ${track.title ?? `Track ${track.track}`}`
              : prev.currentTrackTitle,
          done,
          total,
          etaSeconds: status === "processing" ? etaSeconds : null,
        }));
      },
      albumInfo: { ...albumInfoValues },
    });

    if ("file" in result && result.file && result.fileName) {
      downloadBlob(result.file, result.fileName);
    } else if ("zipBlob" in result && result.zipBlob) {
      downloadBlob(
        result.zipBlob,
        `${audioFile.name.replace(/\.[^.]+$/, "")}-split.zip`,
      );
    }
  }

  useEffect(() => {
    if (["processing", "zipping"].includes(splitState.status)) {
      processModalRef.current?.showModal();
    } else if (splitState.status === "done") {
      processModalRef.current?.close();
    }
  });

  function handleCancel() {
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });

    const timeout = setTimeout(() => setTrackSheet([]), 1000);
    return () => {
      clearTimeout(timeout);
    };
  }

  return (
    <section
      className="min-h-dvh grid place-items-center py-10"
      ref={tracksTableRef}
    >
      <Container>
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-5 flex items-center gap-3">
            <img
              src={coverSrc || "/album-placeholder.png"}
              alt={albumName}
              className="size-28 sm:size-32 aspect-square object-cover object-center"
              crossOrigin="anonymous"
            />
            <div className="space-y-1.5">
              <Controller
                name="albumName"
                control={control}
                render={({
                  field: { ref, name, value, onChange, onBlur },
                  fieldState,
                }) => (
                  <>
                    <AutosizeInput
                      type="text"
                      value={value ?? ""}
                      onChange={onChange}
                      onBlur={onBlur}
                      name={name}
                      inputRef={ref}
                      inputClassName={`text-xl sm:text-2xl md:text-3xl font-bold`}
                    />
                    {fieldState.error && (
                      <p className="text-error">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
              <div className="text-sm sm:text-base">
                by{" "}
                <Controller
                  name="performer"
                  control={control}
                  render={({
                    field: { ref, name, value, onChange, onBlur },
                    fieldState,
                  }) => (
                    <>
                      <AutosizeInput
                        type="text"
                        value={value ?? ""}
                        onChange={onChange}
                        onBlur={onBlur}
                        name={name}
                        inputRef={ref}
                        inputClassName="text-primary"
                      />
                      {fieldState.error && (
                        <p className="text-error mt-2.5">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
              {(releaseDate || genre) && (
                <div className="text-xs sm:text-sm text-gray-300">
                  <Controller
                    name="releaseDate"
                    control={control}
                    render={({
                      field: { ref, name, value, onChange, onBlur },
                    }) => (
                      <AutosizeInput
                        type="text"
                        value={value ?? ""}
                        onChange={onChange}
                        onBlur={onBlur}
                        name={name}
                        inputRef={ref}
                      />
                    )}
                  />{" "}
                  {genre !== "" && (
                    <>
                      •{" "}
                      <Controller
                        name="genre"
                        control={control}
                        render={({
                          field: { ref, name, value, onChange, onBlur },
                        }) => (
                          <AutosizeInput
                            type="text"
                            value={value ?? ""}
                            onChange={onChange}
                            onBlur={onBlur}
                            name={name}
                            inputRef={ref}
                          />
                        )}
                      />
                    </>
                  )}
                </div>
              )}
              {errors.releaseDate && (
                <p className="text-error mt-2.5">
                  {errors.releaseDate?.message}
                </p>
              )}
              {errors.genre && (
                <p className="text-error mt-2.5">{errors.genre?.message}</p>
              )}
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
                          className="checked:checkbox-primary"
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
              <button onClick={handleCancel} type="button" className="btn">
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
      <ProcessModal ref={processModalRef} splitState={splitState} />
    </section>
  );
}

function Checkbox({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      <input
        type="checkbox"
        className={`checkbox checkbox-xs sm:checkbox-sm md:checkbox-md ${className}`}
        {...rest}
      />
    </label>
  );
}
