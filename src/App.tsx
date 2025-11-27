import { Toaster } from "sonner";
import { AppForm } from "./components/AppForm";
import Footer from "./components/Footer";
import Container from "./components/Container";

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <section className="grid place-items-center min-h-dvh relative">
        <Container>
          <div className="w-full max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                Flacker
              </h1>
              <p>A tool for audio splitting.</p>
            </div>
            <AppForm />
          </div>
        </Container>
        <Footer />
      </section>
    </>
  );
}

export default App;
