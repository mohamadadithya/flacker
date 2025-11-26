import ArrowRight from "~icons/mdi/arrow-right";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  appFormSchema,
  AUDIO_MIME_TYPES,
  CUE_MIME_TYPE,
  type AppFormData,
} from "./schema/app.schema";
import { fileSetter } from "./helpers";

function App() {
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<AppFormData>({
    resolver: zodResolver(appFormSchema),
  });

  function onSubmit(data: AppFormData) {
    console.log(data);
  }

  const isAudioFileExist = useWatch({
    control,
    name: "audioFile",
    compute: (value) => !!value,
  });

  return (
    <>
      <section className="grid place-items-center min-h-dvh relative">
        <div className="container mx-auto px-5">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                Flacker
              </h1>
              <p>A tool for audio splitting.</p>
            </div>
            <div className="bg-base-300 p-6 md:p-8 rounded-xl shadow mt-6">
              <form
                encType="multipart/form-data"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="grid gap-4">
                  <div className="field-group">
                    <label htmlFor="audio">Audio File</label>
                    <Controller
                      name="audioFile"
                      control={control}
                      render={({ field: { ref, onChange, name, onBlur } }) => {
                        return (
                          <input
                            type="file"
                            className={`file-input w-full block mt-2.5 ${errors.audioFile ? "file-input-error" : ""}`}
                            ref={ref}
                            name={name}
                            accept={AUDIO_MIME_TYPES.join(", ")}
                            onChange={(event) => fileSetter(event, onChange)}
                            onBlur={onBlur}
                          />
                        );
                      }}
                    ></Controller>
                    {errors.audioFile && (
                      <p className="text-error mt-2.5">
                        {errors.audioFile?.message}
                      </p>
                    )}
                  </div>
                  <div className="field-group">
                    <label htmlFor="cue">CUE File</label>
                    <Controller
                      name="cueFile"
                      control={control}
                      render={({ field: { ref, onChange, name, onBlur } }) => {
                        return (
                          <input
                            disabled={!isAudioFileExist}
                            type="file"
                            className={`file-input w-full block mt-2.5 ${errors.cueFile ? "not-disabled:file-input-error" : ""}`}
                            accept={CUE_MIME_TYPE}
                            ref={ref}
                            name={name}
                            onChange={(event) => fileSetter(event, onChange)}
                            onBlur={onBlur}
                          />
                        );
                      }}
                    ></Controller>
                    {errors.cueFile && (
                      <p className="text-error mt-2.5">
                        {errors.cueFile?.message}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-5 btn btn-primary btn-block"
                >
                  Split Audio into Tracks
                  <ArrowRight className="size-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
        <footer className="absolute bottom-5 left-2/4 -translate-x-2/4">
          <p className="text-center text-sm text-base-content text-balance">
            Made with ❤️ by{" "}
            <a
              href="https://www.haloadit.com"
              className="link link-hover text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mohamad Adithya
            </a>
          </p>
        </footer>
      </section>
    </>
  );
}

export default App;
