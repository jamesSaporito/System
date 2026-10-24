/**
 * URL of a photo synced from sites/james/media/ (see packages/media). In production photos are
 * served from the site's own domain at /media/; `next dev` points at s3mock via .env.development.
 */
export function mediaUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_MEDIA_URL ?? "/media"}/${path}`;
}
