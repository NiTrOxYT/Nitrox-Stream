/**
 * Utility functions for processing and upscaling movie/show artwork URLs.
 */

export type ImageType = 'poster' | 'backdrop' | 'still' | 'recommendation' | 'search';

/**
 * Normalizes and upscales visual asset URLs from TMDB or WordPress cache.
 */
export function getOptimizedImageUrl(url?: string, type: ImageType = 'poster'): string {
  if (!url) return '';

  let cleanUrl = url.trim();

  // 1. Map type to correct TMDB image resolution
  let size = 'w500'; // default poster size
  switch (type) {
    case 'backdrop':
      size = 'original'; // original backdrop resolution
      break;
    case 'still':
      size = 'w780'; // episode still resolution
      break;
    case 'recommendation':
      size = 'w342'; // related cards
      break;
    case 'search':
      size = 'w342'; // search panel items
      break;
    case 'poster':
    default:
      size = 'w500'; // normal movie/show poster
      break;
  }

  // 2. Rewrite direct TMDB image size parameters (e.g. /w92/ to /w500/)
  if (cleanUrl.includes('image.tmdb.org')) {
    // Replaces /t/p/w92 or /t/p/w185 or /t/p/original with /t/p/<size>
    return cleanUrl.replace(/\/t\/p\/[a-zA-Z0-9_]+/, `/t/p/${size}`);
  }

  // 3. Extract TMDB filename hash from WordPress upload cache links
  // e.g. https://multimovies.watch/wp-content/uploads/2023/04/t6HIqrRAclMCA60NsSmeqe9RmNV-90x135.jpg?wsr
  // Matches: 25 to 45 alphanumeric characters followed optionally by dimensions (-90x135) and extension
  const hashMatch = cleanUrl.match(/([a-zA-Z0-9]{25,45})(-\d+x\d+)?\.(jpg|png|webp|jpeg)/i);
  if (hashMatch) {
    const hash = hashMatch[1];
    return `https://image.tmdb.org/t/p/${size}/${hash}.jpg`;
  }

  return cleanUrl;
}
