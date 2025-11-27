import ArrowRight from "~icons/mdi/arrow-right";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FileInput } from "./FileInput";
import {
  appFormSchema,
  AUDIO_MIME_TYPES,
  CUE_MIME_TYPE,
  type AppFormData,
} from "../schema/app.schema";
import { fileSetter } from "../helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFFmpeg } from "../hooks/ffmpeg.hook";
import { TextShimmer } from "./TextShimmer";
import { convertCueFileToTrackSheet } from "../lib/cue-converter";
import { useAppContext } from "../contexts/app.context";

export function AppForm() {
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<AppFormData>({
    resolver: zodResolver(appFormSchema),
  });

  const { isLoaded } = useFFmpeg();
  const { setTrackSheet, trackSheet } = useAppContext();

  console.log(trackSheet);

  async function onSubmit(data: AppFormData) {
    const { cueFile } = data;
    const { trackSheet } = await convertCueFileToTrackSheet(cueFile);

    setTrackSheet(trackSheet);
  }

  const isAudioFileExist = useWatch({
    control,
    name: "audioFile",
    compute: (value) => !!value,
  });

  return (
    <div className="bg-base-300 p-6 md:p-8 rounded-xl shadow mt-6 relative overflow-hidden">
      {!isLoaded && (
        <progress className="progress w-full absolute top-0 left-0 h-1"></progress>
      )}
      <form encType="multipart/form-data" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="field-group">
            <label htmlFor="audio">Audio File</label>
            <Controller
              name="audioFile"
              control={control}
              render={({ field: { ref, onChange, name, onBlur } }) => {
                return (
                  <FileInput
                    disabled={!isLoaded}
                    ref={ref}
                    name={name}
                    isError={!!errors.audioFile}
                    mimeTypes={AUDIO_MIME_TYPES}
                    onChange={(event) => fileSetter(event, onChange)}
                    onBlur={onBlur}
                  />
                );
              }}
            ></Controller>
            {errors.audioFile && (
              <p className="text-error mt-2.5">{errors.audioFile?.message}</p>
            )}
          </div>
          <div className="field-group">
            <label htmlFor="cue">CUE File</label>
            <Controller
              name="cueFile"
              control={control}
              render={({ field: { ref, onChange, name, onBlur } }) => {
                return (
                  <FileInput
                    disabled={!isAudioFileExist || !isLoaded}
                    ref={ref}
                    name={name}
                    isError={!!errors.cueFile}
                    mimeTypes={CUE_MIME_TYPE}
                    onChange={(event) => fileSetter(event, onChange)}
                    onBlur={onBlur}
                  />
                );
              }}
            ></Controller>
            {errors.cueFile && (
              <p className="text-error mt-2.5">{errors.cueFile?.message}</p>
            )}
          </div>
        </div>
        <button type="submit" className="mt-5 btn btn-primary btn-block">
          Split Audio into Tracks
          <ArrowRight className="size-5" />
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
