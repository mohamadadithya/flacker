import * as z from "zod/v4";

const AUDIO_MIME_TYPES = [
  "audio/flac",
  "audio/wav",
  "audio/ape",
  "audio/x-ape",
  "audio/wv",
  "audio/x-wv",
];

const CUE_MIME_TYPES = [
  ".cue",
  "application/x-cue",
  "audio/x-cue",
  "text/x-cuesheet",
  "application/vnd.cue",
  "text/plain",
];

const COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const audioFileSchema = z.file({ message: "Please select an audio file." });
const cueFileSchema = z.file({ message: "Please select a cue file." });
const coverFileSchema = z.file({ message: "Please select a cover image." });

audioFileSchema.min(1, { message: "Please select an audio file." });
audioFileSchema.mime(AUDIO_MIME_TYPES);

cueFileSchema.min(1, { message: "Please select a cue file." });
cueFileSchema.mime(CUE_MIME_TYPES);

coverFileSchema.min(1, { message: "Please select a cover image." });
coverFileSchema.mime(COVER_MIME_TYPES);

const appFormSchema = z.object({
  audioFile: audioFileSchema,
  cueFile: cueFileSchema,
  albumCover: z
    .union([z.url("Image must be a valid URL"), coverFileSchema])
    .optional(),
});

type AppFormData = z.infer<typeof appFormSchema>;

export {
  appFormSchema,
  AUDIO_MIME_TYPES,
  CUE_MIME_TYPES,
  COVER_MIME_TYPES,
  type AppFormData,
};
