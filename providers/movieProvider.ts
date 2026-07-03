// providers/movieProvider.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://multimovies.watch';
const SEARCH_API = `${BASE_URL}/wp-json/dooplay/search/`;

export interface MovieSearchResult {
  id: string;
  title: string;
  slug: string;
  poster: string;
  year: number;
  rating: number;
}

/**
 * Search movies (already working)
 */
export async function searchMovies(
  keyword: string,
  nonce: string
): Promise<MovieSearchResult[]> {
  const response = await axios.get(SEARCH_API, {
    params: { keyword, nonce },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      Referer: BASE_URL,
    },
  });
  return response.data;
}

/**
 * Get a valid nonce from the homepage
 */
export async function getSearchNonce(): Promise<string> {
  // Try to extract from the page — or use a pre-known pattern
  // The Dooplay theme stores nonce in JS globals or a meta tag
  const response = await axios.get(BASE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    },
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // Try common Dooplay nonce patterns
  const scriptContent = $('script:contains("nonce")').text();
  const match = scriptContent.match(/["']nonce["']\s*:\s*["']([^"']+)["']/);
  if (match) return match[1];

  // Fallback: extract from search form
  const nonceInput = $('#search-all-nonce').val() as string;
  if (nonceInput) return nonceInput;

  throw new Error('Could not extract search nonce');
}

/**
 * Get SVID token from a movie page
 */
export async function getSvidToken(slug: string): Promise<string> {
  const movieUrl = `${BASE_URL}/movies/${slug}/`;
  const response = await axios.get(movieUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
    },
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // Look for iframe pointing to pro.iqsmartgames.com/svid/
  const iframeSrc = $('iframe[src*="iqsmartgames.com/svid/"]').attr('src');
  if (iframeSrc) {
    const token = iframeSrc.split('/svid/')[1]?.split(/[?#]/)[0];
    if (token) return token;
  }

  // Look for data attributes or links with the svid pattern
  const linkHref = $(`a[href*="iqsmartgames.com/svid/"]`).attr('href');
  if (linkHref) {
    const token = linkHref.split('/svid/')[1]?.split(/[?#]/)[0];
    if (token) return token;
  }

  // Fallback: look in embedded script data
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const text = $(script).html() || '';
    const match = text.match(/iqsmartgames\.com\/svid\/([a-zA-Z0-9]+)/);
    if (match) return match[1];
  }

  throw new Error(`Could not extract SVID token for slug: ${slug}`);
}