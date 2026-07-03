// lib/provider.ts
import type { Movie } from '@/types/movie';
import type { TvShow, SeasonInfo, EpisodeInfo } from '@/types/tv';
import type { AjaxResponse } from '@/types/api';
import * as cheerio from "cheerio";
import { extractResilientPostId } from './embedHelper';

const BASE = 'https://multimovies.watch';

export class LiveProvider {
  /* ------------------------------------------------------------------ */
  /* 1️⃣  Search the public JSON endpoint.                               */
  /* ------------------------------------------------------------------ */
  async search(query: string): Promise<Movie[]> {
    try {
      /* 1. Grab a fresh nonce from the home page -------------------- */
      const homeResp = await fetch(`${BASE}/`);
      const homeHtml = await homeResp.text();
      const nonceMatch = /nonce=([a-f0-9]+)"/i.exec(homeHtml);
      const nonce = nonceMatch ? nonceMatch[1] : 'fe82d6f2ab';

      /* 2. Call the JSON endpoint ------------------------------------ */
      const searchUrl = `${BASE}/wp-json/dooplay/search/?keyword=${encodeURIComponent(
        query
      )}&nonce=${nonce}`;
      const searchResp = await fetch(searchUrl);
      if (!searchResp.ok) {
        throw new Error(`Search endpoint returned ${searchResp.status}`);
      }
      interface SearchRecord {
        title: string;
        url: string;
        img?: string;
        extra?: {
          date?: string;
          imdb?: string;
        };
      }
      const raw = (await searchResp.json()) as Record<string, SearchRecord>;

      /* 3. Convert to array of Movie --------------------------------- */
      return Object.entries(raw).map(([id, rec]) => ({
        id,
        title: rec.title,
        slug: this.slugFromUrl(rec.url),
        poster: rec.img,
        year: rec.extra?.date ? Number(rec.extra.date) : undefined,
        rating: rec.extra?.imdb ? Number(rec.extra.imdb) : undefined,
        type: rec.url?.includes('/tvshows/') ? 'tv' as const : 'movie' as const,
      }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LiveProvider.search] error:', errMsg);
      throw err; // re‑throw so the route can format it
    }
  }

  /* ------------------------------------------------------------------ */
  /* 2️⃣  Fetch movie page and extract SVID token from the player URL. */
  /* ------------------------------------------------------------------ */
  async getMovie(slug: string): Promise<Movie | null> {
    try {
      const url = `${BASE}/movies/${slug}/`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch movie page");
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const titleText = $('title').first().text().replace('Multimovies | ', '').trim() ||
        $('h1').first().text().trim();
      const year = Number($('span.year').text().trim()) || undefined;
      const description =
        $('meta[name="description"]').attr('content') || undefined;
      const poster =
        $('meta[property="og:image"]').first().attr('content') ||
        $('img.poster').attr('src') ||
        undefined;
      const backdrop = $('img.backdrop').attr('src') || undefined;
      const genres = $('a.genre')
        .map((_, el) => $(el).text().trim())
        .get();

      // Search for the SVID URL in multiple locations
      let playerUrl: string | undefined;

      // 0. WordPress post ID → admin-ajax → embed URL → file ID → SVID
      {
        const postId = await extractResilientPostId(html);
        if (postId) {
          try {
            const embedForm = new URLSearchParams();
            embedForm.append('action', 'doo_player_ajax');
            embedForm.append('post', String(postId));
            embedForm.append('nume', '1');
            embedForm.append('type', 'movie');

            const epResp = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: embedForm,
            });

            if (epResp.ok) {
              const epData = await epResp.json() as AjaxResponse;
              const embedUrl: string | undefined = epData.embed_url;
              if (embedUrl) {
                playerUrl = embedUrl;
              }
            }
          } catch {
            // fall through to legacy methods
          }
        }
      }

      // 1. Direct iframe with id="player"
      if (!playerUrl) {
        playerUrl = $('iframe#player').attr('src');
      }

      // 2. Any iframe pointing to pro.iqsmartgames.com/svid/
      if (!playerUrl) {
        $('iframe').each((_, el) => {
          const src = $(el).attr('src') || '';
          if (src.includes('pro.iqsmartgames.com/svid/')) {
            playerUrl = src;
            return false;
          }
        });
      }

      // 3. Inline scripts containing the SVID URL
      if (!playerUrl) {
        $('script').each((_, el) => {
          const text = $(el).html() || '';
          const m = text.match(/https?:\/\/pro\.iqsmartgames\.com\/svid\/[a-zA-Z0-9]+/);
          if (m) {
            playerUrl = m[0];
            return false;
          }
        });
      }

      // 4. Any attribute containing the SVID URL
      if (!playerUrl) {
        const htmlLower = html.toLowerCase();
        const svidIndex = htmlLower.indexOf('pro.iqsmartgames.com/svid/');
        if (svidIndex !== -1) {
          const endQuote = html.indexOf("'", svidIndex);
          const endDQuote = html.indexOf('"', svidIndex);
          const end = endQuote !== -1 && (endDQuote === -1 || endQuote < endDQuote) ? endQuote : endDQuote;
          if (end !== -1) {
            playerUrl = html.substring(svidIndex, end);
          } else {
            playerUrl = html.substring(svidIndex, svidIndex + 100).split(/[>\s]/)[0];
          }
        }
      }

      return {
        id: slug,
        title: titleText,
        slug,
        year,
        description,
        poster,
        backdrop,
        genres,
        rating: undefined,
        playerUrl,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LiveProvider.getMovie] error:', errMsg);
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3️⃣  Fetch TV show page and extract seasons + episodes.            */
  /* ------------------------------------------------------------------ */
  async getTvShow(slug: string): Promise<TvShow | null> {
    try {
      const url = `${BASE}/tvshows/${slug}/`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch TV show page");
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const titleText =
        $('title').first().text().replace('Multimovies | ', '').trim() ||
        $('h1').first().text().trim();
      const year = Number($('span.date').first().text().trim()) || undefined;
      const description =
        $('meta[name="description"]').attr('content') || undefined;
      const poster =
        $('meta[property="og:image"]').first().attr('content') ||
        $('img.poster').attr('src') ||
        undefined;
      const backdrop = $('img.backdrop').attr('src') || undefined;
      const genres = $('div.sgeneros a')
        .map((_, el) => $(el).text().trim())
        .get();

      // Parse seasons and episodes
      const seasons: SeasonInfo[] = [];

      $('#seasons .se-c').each((_, seasonEl) => {
        const seasonNum = parseInt(
          $(seasonEl).find('.se-t').first().text().trim(),
          10
        );
        if (isNaN(seasonNum)) return;

        const episodes: EpisodeInfo[] = [];

        $(seasonEl)
          .find('ul.episodios li')
          .each((_, epEl) => {
            const numerando = $(epEl).find('.numerando').text().trim();
            const parts = numerando.split('-').map((s) => s.trim());
            const epNum = parseInt(parts[1], 10);
            if (isNaN(epNum)) return;

            const title = $(epEl).find('.episodiotitle a').text().trim();
            const epHref = $(epEl).find('.episodiotitle a').attr('href') || '';
            const epSlug = epHref.split('/').filter(Boolean).pop() || '';

            if (title && epSlug) {
              episodes.push({
                episode: epNum,
                title,
                slug: epSlug,
              });
            }
          });

        if (episodes.length > 0) {
          seasons.push({
            season: seasonNum,
            episodes,
          });
        }
      });

      return {
        id: slug,
        title: titleText,
        slug,
        year,
        description,
        poster,
        backdrop,
        genres,
        rating: undefined,
        seasons,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LiveProvider.getTvShow] error:', errMsg);
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4️⃣  Fetch an episode page and extract its WordPress post ID.     */
  /* ------------------------------------------------------------------ */
  async getEpisodePostId(episodeSlug: string): Promise<number | null> {
    try {
      const url = `${BASE}/episodes/${episodeSlug}/`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) return null;

      const html = await response.text();

      const postId = await extractResilientPostId(html);
      return postId;
    } catch {
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Helper – turn “/movies/avengers-endgame/” → “avengers-endgame”   */
  /* ------------------------------------------------------------------ */
  private slugFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }
}