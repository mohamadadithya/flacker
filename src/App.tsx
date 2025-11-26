import { useState } from "react";
import ArrowRight from "~icons/mdi/arrow-right";

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [cueFile, setCueFile] = useState<File | null>(null);

  function fileSetter(
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) {
    const file = event.target.files?.[0];
    setter(file || null);
  }

  console.log(cueFile, audioFile);

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
              <form encType="multipart/form-data">
                <div className="grid gap-4">
                  <div className="field-group">
                    <label htmlFor="audio">Audio File</label>
                    <input
                      type="file"
                      name="audio"
                      id="audio"
                      className="file-input w-full block mt-2.5"
                      required
                      onChange={(event) => fileSetter(event, setAudioFile)}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="cue">CUE File</label>
                    <input
                      disabled={audioFile === null}
                      type="file"
                      name="cue"
                      id="cue"
                      className="file-input w-full block mt-2.5"
                      required
                      onChange={(event) => fileSetter(event, setCueFile)}
                    />
                  </div>
                </div>
                <button
                  type="button"
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
