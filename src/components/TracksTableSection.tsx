import type React from "react";
import { useAppContext } from "../contexts/app.context";
import Container from "./Container";
import ArrowRight from "~icons/mdi/arrow-right";

export default function TracksTableSection() {
  const { trackSheet, setTrackSheet, tracksTableRef } = useAppContext();
  const HEADERS = ["No", "Title", "Performer", "Duration"];

  return (
    <section
      className="min-h-dvh grid place-items-center py-10"
      ref={tracksTableRef}
    >
      <Container>
        <div className="overflow-x-auto w-full max-w-4xl mx-auto">
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
          <div className="divider"></div>
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
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
