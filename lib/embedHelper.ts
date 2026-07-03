// lib/embedHelper.ts
import axios from 'axios';
import { createCipheriv, createDecipheriv } from 'crypto';

const AES_KEY = 'kiemtienmua911ca';
const AES_IVS = ['1234567890oiuytr', '0123456789abcdef'];

/**
 * Decrypt AES-128-CBC hex ciphertext
 */
function decryptAES(hexCiphertext: string, iv: string): string {
  const decipher = createDecipheriv('aes-128-cbc', AES_KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hexCiphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}

/**
 * Try all known IVs until decryption succeeds
 */
function tryDecrypt(hexCiphertext: string): string {
  for (const iv of AES_IVS) {
    try {
      return decryptAES(hexCiphertext, iv);
    } catch {
      continue;
    }
  }
  throw new Error('Failed to decrypt with all known IVs');
}

/**
 * Step 1: POST to embedhelper.php to get sources + mresult
 */
export async function getEmbedSources(svidToken: string) {
  const host = 'https://pro.iqsmartgames.com';
  const sid = svidToken; // The token after /svid/

  const formData = new URLSearchParams();
  formData.append('sid', sid);
  formData.append('UserFavSite', '');
  formData.append('currentDomain', 'https://multimovies.watch');

  const response = await axios.post(`${host}/embedhelper.php`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      Referer: `${host}/svid/${sid}`,
    },
  });

  const data = response.data;

  // siteUrls: { "rpmshare": "https://multimovies.rpmhub.site/#", ... }
  const siteUrls: Record<string, string> = data.siteUrls || {};

  // mresult is base64 -> JSON.parse -> { "rpmshare": "kyp8zl", ... }
  let mresult: Record<string, string> = {};
  if (data.mresult) {
    if (typeof data.mresult === 'object') {
      mresult = data.mresult;
    } else {
      // Base64 decode
      const decoded = Buffer.from(data.mresult, 'base64').toString('utf-8');
      mresult = JSON.parse(decoded);
    }
  }

  const siteFriendlyNames: Record<string, string> = data.siteFriendlyNames || {};

  // Build full URLs: siteUrl + mresult value
  const sources: Array<{
    key: string;
    name: string;
    url: string; // e.g., https://multimovies.rpmhub.site/#kyp8zl
  }> = [];

  for (const key of Object.keys(siteUrls)) {
    if (mresult[key]) {
      const baseUrl = siteUrls[key].replace(/\/$/, '');
      const hash = mresult[key];
      sources.push({
        key,
        name: siteFriendlyNames[key] || key,
        url: `${baseUrl}/${hash}`,
      });
    }
  }

  return sources;
}

/**
 * Step 2: Given a provider URL (e.g., https://multimovies.rpmhub.site/#kyp8zl),
 * call api/v1/video, decrypt, return the HLS master playlist URL
 */
export async function getHlsUrl(providerUrl: string): Promise<string> {
  // Some URLs are proxied through hlsplayer; extract the inner URL
  const innerUrlMatch = providerUrl.match(/hlsplayer\?url=([^#]+)/);
  const effectiveUrl = innerUrlMatch ? decodeURIComponent(innerUrlMatch[1]) + '#' + (providerUrl.split('#')[1] || '') : providerUrl;

  const hash = effectiveUrl.split('#').pop()?.split('/').pop() || '';
  const baseUrl = new URL(effectiveUrl).origin;

  const response = await axios.get(`${baseUrl}/api/v1/video?id=${hash}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      Referer: 'https://multimovies.watch/',
    },
    responseType: 'text',
  });

  const hexCiphertext = response.data.trim();
  const decryptedJson = tryDecrypt(hexCiphertext);
  const parsed = JSON.parse(decryptedJson);

  // The "source" field contains the HLS master playlist URL
  const m3u8Url = parsed.source?.replace(/\\\//g, '/');
  if (!m3u8Url) throw new Error('No source URL found in decrypted response');

  return m3u8Url;
}

/**
 * Full flow: SVID token -> sources -> first available source -> HLS URL
 */
const BASE = 'https://multimovies.watch';

/**
 * Step 3: Resolve a WordPress post ID to an iframe player URL.
 * Handles both movies (type=movie) and TV episodes (type=tv, nume=episode number).
 */
export async function resolvePostIdToPlayerUrl(
  postId: number,
  options?: { type?: string; nume?: string }
): Promise<string> {
  const embedForm = new URLSearchParams();
  embedForm.append('action', 'doo_player_ajax');
  embedForm.append('post', String(postId));
  embedForm.append('nume', options?.nume || '1');
  embedForm.append('type', options?.type || 'movie');

  const epResp = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: embedForm,
  });

  if (!epResp.ok) {
    throw new Error(`admin-ajax returned ${epResp.status}`);
  }

  const epData = (await epResp.json()) as Record<string, any>;
  const embedUrl: string | undefined = epData.embed_url;
  if (!embedUrl) {
    throw new Error('No embed_url in admin-ajax response');
  }

  const fileId = embedUrl.split('/').pop() || '';
  if (!fileId) {
    throw new Error('Could not extract file ID from embed URL');
  }

  const svidToken = fileId;
  const sources = await getEmbedSources(svidToken);
  if (sources.length === 0) {
    throw new Error('No video sources found');
  }

  const providerUrl = sources[0].url;
  const playerUrl = `https://plyr.technocosmos.surf/hlsplayer?url=${encodeURIComponent(providerUrl)}`;

  return playerUrl;
}

export async function resolveSvidToHls(svidToken: string): Promise<string> {
  const sources = await getEmbedSources(svidToken);
  if (sources.length === 0) throw new Error('No sources found');

  // Try each source in order until one succeeds
  for (const source of sources) {
    try {
      console.log(`Trying source: ${source.name} (${source.key})`);
      return await getHlsUrl(source.url);
    } catch (err: any) {
      console.log(`Source ${source.name} failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('All sources failed to resolve HLS URL');
}