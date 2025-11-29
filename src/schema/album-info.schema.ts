import * as z from "zod";

const albumInfoSchema = z.object({
  albumName: z.string().min(1, { error: "Please enter album name" }),
  performer: z.string().min(1, { error: "Please enter performer name" }),
  releaseDate: z.string().min(1, { error: "Please enter release date" }),
  genre: z.string().min(1, { error: "Please enter genre" }),
});

type AlbumInfoFormData = z.infer<typeof albumInfoSchema>;

export { albumInfoSchema, type AlbumInfoFormData };
