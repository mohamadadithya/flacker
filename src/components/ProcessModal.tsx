import { PHASE_TEXT, STEP_TEXT, type SplitUIState } from "../lib/splitter";
import { TextShimmer } from "./TextShimmer";

export default function ProcessModal({
  ref,
  splitState,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  splitState: SplitUIState;
}) {
  return (
    <dialog ref={ref} className="modal">
      <div className="modal-box space-y-2 text-sm">
        <TextShimmer className="font-semibold text-lg">
          {PHASE_TEXT[splitState.phase!]}
        </TextShimmer>

        {splitState.phase !== "processing" ? (
          <p>{splitState.step ? STEP_TEXT[splitState.step] : ""}</p>
        ) : null}

        {splitState.phase === "processing" && splitState.currentTrackTitle && (
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
  );
}
