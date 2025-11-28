import type React from "react";
import { useAppContext } from "../contexts/app.context";
import Container from "./Container";
import ArrowRight from "~icons/mdi/arrow-right";

export default function TracksTableSection() {
  const {
    trackSheet,
    setTrackSheet,
    tracksTableRef,
    albumInfo: { name: albumName, performer, coverSrc },
  } = useAppContext();
  const HEADERS = ["No", "Title", "Performer", "Duration"];

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
                  <th>
                    <Checkbox />
                  </th>
                  {HEADERS.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackSheet.map(({ no, title, performer, duration }, id) => (
                  <tr key={no}>
                    <th>
                      <Checkbox />
                    </th>
                    <td>{id + 1}</td>
                    <td>{title}</td>
                    <td>{performer}</td>
                    <td>{duration}</td>
                  </tr>
                ))}
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
              <button type="button" className="btn btn-primary">
                Download Tracks
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </Container>
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
