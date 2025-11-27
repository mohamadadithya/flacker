import { Toaster } from "sonner";
import { AppForm } from "./components/AppForm";

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <section className="grid place-items-center min-h-dvh relative">
        <div className="container mx-auto px-5">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                Flacker
              </h1>
              <p>A tool for audio splitting.</p>
            </div>
            <AppForm />
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
