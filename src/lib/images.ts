export type Photo = {
  src: string;
  alt: string;
};

/**
 * Hosts next/image may load product photos from (https only). next.config.ts
 * builds its remotePatterns from this list and the admin validates image URLs
 * against it, so the two can't drift apart.
 */
export const IMAGE_HOSTS = ["images.unsplash.com"];

export function unsplash(id: string, alt: string, width = 1600): Photo {
  return {
    src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`,
    alt,
  };
}

// A 4:5 close-up of the same photo, zoomed on a focal point (x, y in 0–1).
export function unsplashDetail(
  id: string,
  alt: string,
  [x, y]: [number, number],
  zoom = 2,
): Photo {
  return {
    src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&w=1200&h=1500&q=80`,
    alt,
  };
}
