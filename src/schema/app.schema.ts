import * as z from "zod/v4";

const AUDIO_MIME_TYPES = [
  "audio/flac",
  "audio/wav",
  "audio/ape",
  "audio/x-ape",
  "audio/wv",
  "audio/x-wv",
];

const CUE_MIME_TYPE = "application/x-cue";

const audioFileSchema = z.file({
  message: "Please select an audio file.",
});

const cueFileSchema = z.file({
  message: "Please select a cue file.",
});

audioFileSchema.min(1, { message: "Please select an audio file." });
audioFileSchema.mime(AUDIO_MIME_TYPES);

cueFileSchema.min(1, { message: "Please select a cue file." });
cueFileSchema.mime(CUE_MIME_TYPE);

const appFormSchema = z.object({
  audioFile: audioFileSchema,
  cueFile: cueFileSchema,
});

type AppFormData = z.infer<typeof appFormSchema>;

export { appFormSchema, AUDIO_MIME_TYPES, CUE_MIME_TYPE, type AppFormData };
