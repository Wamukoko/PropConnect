export const PROPERTY_PHOTOS_BUCKET = "property-private-originals";

interface PhotoRow {
  storage_path: string;
  thumbnail_path?: string | null;
}

export async function resolvePropertyPhotoUrls(supabase: any, photo: PhotoRow) {
  const { data: signed } = await supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .createSignedUrl(photo.storage_path, 3600);

  const { data: thumbSigned } = photo.thumbnail_path
    ? await supabase.storage
        .from(PROPERTY_PHOTOS_BUCKET)
        .createSignedUrl(photo.thumbnail_path, 3600)
    : { data: { signedUrl: signed?.signedUrl ?? null } };

  return {
    signed_url: signed?.signedUrl ?? null,
    thumbnail_url: thumbSigned?.signedUrl ?? null,
  };
}

export async function enrichPhotosWithSignedUrls<T extends { property_photos?: any[] }>(
  rows: T[],
  supabase: any
): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => {
      const photos = row.property_photos || [];
      const enriched = await Promise.all(
        photos.map(async (photo) => {
          const urls = await resolvePropertyPhotoUrls(supabase, photo);
          return { ...photo, ...urls };
        })
      );
      return { ...row, property_photos: enriched };
    })
  );
}