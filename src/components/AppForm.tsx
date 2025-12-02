import ArrowRight from "~icons/mdi/arrow-right";
import { Controller, useWatch } from "react-hook-form";
import { FileInput } from "./FileInput";
import {
  AUDIO_MIME_TYPES,
  COVER_MIME_TYPES,
  CUE_MIME_TYPES,
  type AppFormData,
} from "../schema/app.schema";
import { cn, fileSetter } from "../helpers";
import { TextShimmer } from "./TextShimmer";
import {
  convertCueFileToTrackSheet,
  getAudioDurationFromFile,
} from "../lib/cue-converter";
import { useAppContext } from "../contexts/app.context";
import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";
import FolderOpen from "~icons/mdi/folder-open";
import Trash from "~icons/mdi/trash-outline";

export function AppForm() {
  const {
    setTrackSheet,
    trackSheet,
    tracksTableRef,
    setAlbumInfo,
    ffmpegHook,
    appFormHook,
    appFormRef,
  } = useAppContext();

  const {
    handleSubmit,
    formState: { errors, isValid },
    control,
    getValues,
    resetField,
  } = appFormHook!;

  const { isLoaded } = ffmpegHook;
  const [isProcessingCue, setIsProcessingCue] = useState(false);

  async function convertFileToBlobUrl(file: File | undefined) {
    if (!file) return "";

    const blob = await file.arrayBuffer();
    const blobUrl = URL.createObjectURL(new Blob([blob]));
    return blobUrl;
  }

  async function onSubmit(data: AppFormData) {
    const { cueFile, audioFile, albumCover } = data;

    setIsProcessingCue(true);

    const albumDuration = await getAudioDurationFromFile(audioFile);
    const { trackSheet, cueSheet } = await convertCueFileToTrackSheet(
      cueFile,
      albumDuration,
    );

    const coverSrc =
      typeof albumCover === "string"
        ? albumCover
        : await convertFileToBlobUrl(albumCover);

    setAlbumInfo({
      name: cueSheet.album || "Unknown album",
      performer: cueSheet.performer || "Unknown performer",
      date: cueSheet.date || "Unknown date",
      genre: cueSheet.genre || "Unknown genre",
      coverSrc,
    });

    setTrackSheet(trackSheet);
    setIsProcessingCue(false);
  }

  useEffect(() => {
    if (trackSheet.length) {
      tracksTableRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [trackSheet, tracksTableRef]);

  const isAudioFileExist = useWatch({
    control,
    name: "audioFile",
    compute: (value) => !!value,
  });

  const isCueFileExist = useWatch({
    control,
    name: "cueFile",
    compute: (value) => !!value,
  });

  const isAlbumCoverExist = useWatch({
    control,
    name: "albumCover",
    compute: (value) => !!value,
  });

  const albumCover = useWatch({
    control,
    name: "albumCover",
    compute: (value) => {
      if (!(value instanceof File)) return null;

      return URL.createObjectURL(value);
    },
  });

  useEffect(() => {
    return () => {
      if (albumCover) URL.revokeObjectURL(albumCover);
    };
  }, [albumCover]);

  const isCoverInputDisabled =
    !isAudioFileExist || !isCueFileExist || !isLoaded || isProcessingCue;

  const generalDisabledState = !isLoaded || isProcessingCue;
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const cueInputRef = useRef<HTMLInputElement | null>(null);

  const albumCoverValue = useWatch({
    control,
    name: "albumCover",
    compute: (value) => value,
  });

  return (
    <div className="bg-base-300 p-6 md:p-8 rounded-xl shadow mt-6 relative overflow-hidden">
      {!isLoaded && (
        <progress className="progress w-full absolute top-0 left-0 h-1"></progress>
      )}
      <form
        ref={appFormRef}
        encType="multipart/form-data"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid gap-4">
          <div className="field-group">
            <label htmlFor="audio">Audio File</label>
            {isAudioFileExist ? (
              <ValueInfoRow
                className="mt-2.5"
                label={getValues("audioFile").name}
                disabled={generalDisabledState}
                onClickRemove={() => resetField("audioFile")}
              />
            ) : (
              <>
                <Controller
                  name="audioFile"
                  control={control}
                  render={({ field }) => {
                    const { ref, onChange, onBlur, name } = field;

                    return (
                      <FileInput
                        disabled={generalDisabledState}
                        ref={ref}
                        id="audio"
                        name={name}
                        isError={!!errors.audioFile}
                        mimeTypes={AUDIO_MIME_TYPES}
                        onChange={(event) => {
                          fileSetter(event, onChange);

                          if (isCueFileExist) {
                            resetField("cueFile");
                            if (cueInputRef.current)
                              cueInputRef.current.value = "";
                          }

                          if (isAlbumCoverExist) resetField("albumCover");
                        }}
                        onBlur={onBlur}
                      />
                    );
                  }}
                />
                {errors.audioFile && (
                  <p className="text-error mt-2.5">
                    {errors.audioFile?.message}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="field-group">
            <label htmlFor="cue">CUE File</label>
            {isCueFileExist ? (
              <ValueInfoRow
                image="/cue-placeholder.webp"
                className="mt-2.5"
                label={getValues("cueFile").name}
                disabled={generalDisabledState}
                onClickRemove={() => resetField("cueFile")}
              />
            ) : (
              <>
                <Controller
                  name="cueFile"
                  control={control}
                  render={({
                    field: { ref: rhfRef, onChange, name, onBlur },
                  }) => {
                    return (
                      <FileInput
                        disabled={!isAudioFileExist || generalDisabledState}
                        ref={(el) => {
                          rhfRef(el);
                          cueInputRef.current = el;
                        }}
                        id="cue"
                        name={name}
                        isError={!!errors.cueFile}
                        mimeTypes={CUE_MIME_TYPES}
                        onChange={(event) => fileSetter(event, onChange)}
                        onBlur={onBlur}
                      />
                    );
                  }}
                ></Controller>
                {errors.cueFile && (
                  <p className="text-error mt-2.5">{errors.cueFile?.message}</p>
                )}
              </>
            )}
          </div>
          <div className="field-group">
            <label htmlFor="cover-src">Album Cover</label>
            {albumCover ? (
              <ValueInfoRow
                image={albumCover}
                className="mt-2.5"
                label={
                  typeof albumCoverValue === "string"
                    ? "Album Cover"
                    : albumCoverValue?.name || "Album Cover"
                }
                disabled={generalDisabledState}
                onClickRemove={() => resetField("albumCover")}
              />
            ) : (
              <>
                <div className="join w-full mt-2.5">
                  <div
                    className={
                      !isCoverInputDisabled ? "tooltip tooltip-bottom" : ""
                    }
                    data-tip="Browse"
                  >
                    <button
                      onClick={() => coverFileInputRef.current?.showPicker()}
                      disabled={isCoverInputDisabled}
                      type="button"
                      className="btn btn-neutral join-item"
                      aria-label="Browse"
                    >
                      <FolderOpen />
                    </button>
                  </div>
                  <label htmlFor="cover-src" className="input join-item w-full">
                    <Controller
                      name="albumCover"
                      control={control}
                      render={({ field }) => {
                        const { value, onChange, onBlur, ref } = field;
                        const urlValue = typeof value === "string" ? value : "";
                        return (
                          <>
                            <input
                              disabled={isCoverInputDisabled}
                              type="text"
                              id="cover-src"
                              name={field.name}
                              placeholder="or enter image url..."
                              ref={ref}
                              value={urlValue}
                              onChange={(e) => {
                                const v = e.target.value;
                                onChange(v === "" ? undefined : v);
                              }}
                              onBlur={onBlur}
                            />
                            <input
                              ref={coverFileInputRef}
                              className="hidden"
                              accept={COVER_MIME_TYPES.join(", ")}
                              type="file"
                              id="cover-file"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                onChange(file ?? undefined);

                                if (isValid) {
                                  appFormRef.current?.dispatchEvent(
                                    new Event("submit", {
                                      cancelable: true,
                                      bubbles: true,
                                    }),
                                  );
                                }
                              }}
                              onBlur={onBlur}
                            />
                          </>
                        );
                      }}
                    />
                  </label>
                </div>
                {errors.albumCover && (
                  <p className="text-error mt-2.5">
                    {errors.albumCover?.message}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <button
          disabled={generalDisabledState}
          type="submit"
          className="mt-5 btn btn-primary btn-block"
        >
          {isProcessingCue ? (
            <>
              Processing...
              <Spinner />
            </>
          ) : (
            <>
              Split Audio into Tracks
              <ArrowRight className="size-5" />
            </>
          )}
        </button>
      </form>
      {!isLoaded && (
        <TextShimmer
          className="text-sm text-center mt-4 flex items-center justify-center"
          duration={2}
        >
          Please wait, FFmpeg is loading...
        </TextShimmer>
      )}
    </div>
  );
}

function ValueInfoRow({
  label = "",
  image,
  disabled = false,
  onClickRemove,
  className = "",
}: {
  label?: string;
  image?: string | null;
  disabled?: boolean;
  onClickRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pl-2 pr-4 py-2 bg-base-200 rounded-lg shadow flex items-center justify-between gap-4 border",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <img
          src={image || "/album-placeholder.png"}
          alt="Album Cover"
          className="size-14 aspect-square object-cover object-center"
        />
        <p className="text-sm sm:text-base">{label}</p>
      </div>
      <button
        disabled={disabled}
        onClick={onClickRemove}
        type="button"
        className="btn btn-error btn-sm"
      >
        <Trash className="size-5" />
        Remove
      </button>
    </div>
  );
}
