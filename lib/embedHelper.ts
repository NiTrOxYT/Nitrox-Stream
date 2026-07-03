// lib/embedHelper.ts
import axios from 'axios';
import { createDecipheriv } from 'crypto';
import type { EmbedSource, AjaxResponse } from '@/types/api';
import { resolverCache } from './cache';
import { recordRequest, recordProvider, recordCache } from './metrics';
import https from 'https';

const AES_KEY = 'kiemtienmua911ca';
const AES_IVS = ['1234567890oiuytr', '0123456789abcdef'];

const BASE = 'https://multimovies.watch';

// Global agent that ignores expired/invalid TLS/SSL certificates of media mirrors
const agent = new https.Agent({ rejectUnauthorized: false });

export interface DiscoveredProvider {
  id: string;
  name: string;
  url: string;
  type: 'hls' | 'iframe';
}

export interface ProviderHealth {
  provider: string;
  id: string;
  status: string;
  duration: number;
}

export interface ResolutionResult {
  playerUrl: string;
  meta: {
    provider: string;
    strategy: string;
    validated: boolean;
    responseTime: number;
    retries: number;
  };
}

export class ResolutionError extends Error {
  public step: string;
  public providers: Array<{ name: string; status: string }>;

  constructor(step: string, providers: Array<{ name: string; status: string }>) {
    super('No playable provider found');
    this.step = step;
    this.providers = providers;
    Object.setPrototypeOf(this, ResolutionError.prototype);
  }
}

export class ResolverContext {
  public requestId: string;
  public slug: string;
  public type: 'movie' | 'tv';
  public startTime: number;
  public cache: 'HIT' | 'MISS' = 'MISS';
  public timings: Record<string, number> = {};
  public stages: Array<{ name: string; status: 'success' | 'failed'; duration: number; error?: string }> = [];
  public providers: ProviderHealth[] = [];

  constructor(slug: string, type: 'movie' | 'tv', requestId?: string) {
    this.slug = slug;
    this.type = type;
    this.requestId = requestId || Math.random().toString(16).substring(2, 6);
    this.startTime = Date.now();
  }

  public debug(message: string): void {
    if (process.env.DEBUG_RESOLVER === 'true') {
      console.log(`[resolver][${this.requestId}] ${message}`);
    }
  }

  public startTiming(name: string) {
    this.timings[name] = Date.now();
  }

  public endTiming(name: string, status: 'success' | 'failed' = 'success', error?: string): number {
    if (this.timings[name]) {
      const duration = Date.now() - this.timings[name];
      this.logStage(name, status, duration, error);
      delete this.timings[name];
      return duration;
    }
    return 0;
  }

  public logStage(name: string, status: 'success' | 'failed', duration: number, error?: string): void {
    this.stages.push({ name, status, duration, error });
    if (process.env.DEBUG_RESOLVER === 'true') {
      console.log(`[resolver][${this.requestId}] Stage: ${name} | Status: ${status.toUpperCase()} | Duration: ${duration}ms${error ? ` | Error: ${error}` : ''}`);
    }
  }

  public logProvider(provider: string, id: string, status: string, duration: number): void {
    this.providers.push({ provider, id, status, duration });
    if (process.env.DEBUG_RESOLVER === 'true') {
      console.log(`[resolver][${this.requestId}] Provider: ${provider} | ID: ${id} | Result: ${status.toUpperCase()} | Duration: ${duration}ms`);
    }
  }

  public printSummary(success: boolean = true, resolvedProvider?: string, resolvedStrategy?: string): void {
    console.log(`\n==================================================`);
    console.log(`Resolver Summary`);
    console.log(`==================================================`);
    console.log(`Request ID:\n${this.requestId}\n`);
    console.log(`Slug:\n${this.slug}\n`);
    console.log(`Strategy:\n${resolvedStrategy || 'N/A'}\n`);
    console.log(`Provider:\n${resolvedProvider || 'N/A'}\n`);
    console.log(`Validated:\n${success ? 'YES' : 'NO'}\n`);
    console.log(`Cache:\n${this.cache}\n`);
    
    if (success) {
      console.log(`Stage Timings`);
      for (const stage of this.stages) {
        console.log(`${stage.name.padEnd(20)} ${stage.duration}ms`);
      }
      console.log(`${'Total'.padEnd(20)} ${Date.now() - this.startTime}ms`);
    } else {
      console.log(`Result:\nFAILED\n`);
      const failedStage = this.stages.find(s => s.status === 'failed')?.name || 'Unknown';
      console.log(`Failed Stage:\n${failedStage}\n`);
      const reports = this.providers.map(p => `${p.provider} (${p.status})`).join(', ');
      console.log(`Failed Providers:\n${reports || 'None'}`);
    }
    console.log(`==================================================\n`);
  }
}

interface ResolutionStrategy {
  name: string;
  canHandle(embedUrl: string): boolean;
  resolve(embedUrl: string, context: ResolverContext): Promise<DiscoveredProvider[]>;
}

async function fetchWithRetry(
  url: string,
  options: any = {},
  retries = 2,
  backoffMs = 200
): Promise<any> {
  const timeout = options.timeout || 3000;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const source = axios.CancelToken.source();
      const timer = setTimeout(() => {
        source.cancel(`timeout of ${timeout}ms exceeded`);
      }, timeout);

      let response;
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'POST') {
        response = await axios.post(url, options.data || options.body || {}, {
          ...options,
          cancelToken: source.token,
        });
      } else {
        response = await axios.get(url, {
          ...options,
          cancelToken: source.token,
        });
      }

      clearTimeout(timer);
      return response;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      const delay = backoffMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
 * Stage 1: Call TV show Series API to resolve to SVID
 */
class TVShowStrategy implements ResolutionStrategy {
  public name = 'TV Show Series API Strategy';

  public canHandle(embedUrl: string): boolean {
    return embedUrl.includes('/tv/') || embedUrl.includes('myseriesapi');
  }

  public async resolve(embedUrl: string, context: ResolverContext): Promise<DiscoveredProvider[]> {
    const match = embedUrl.match(/\/embed\/tv\/(\d+)\/(\d+)\/([^/?]+)/);
    if (!match) {
      throw new Error('Embed URL does not match TV show pattern /embed/tv/');
    }

    const tmdbid = match[1];
    const season = match[2];
    const epname = match[3];
    
    let key = '';
    try {
      const urlObj = new URL(embedUrl);
      key = urlObj.searchParams.get('key') || '';
    } catch {
      // Ignored
    }

    const cacheKey = `fileslug:${tmdbid}:${season}:${epname}`;
    let fileslug = resolverCache.get<string>(cacheKey);

    if (fileslug) {
      context.cache = 'HIT';
      recordCache(true);
    } else {
      recordCache(false);
      const seriesApiUrl = `https://streams.iqsmartgames.com/myseriesapi?tmdbid=${tmdbid}&season=${season}&epname=${encodeURIComponent(epname)}&key=${key}`;
      context.debug(`Querying TV Series API: ${seriesApiUrl.replace(/key=[^&]+/, 'key=[REDACTED]')}`);
      
      const response = await fetchWithRetry(seriesApiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: embedUrl,
        },
        timeout: 5000,
        httpsAgent: agent,
      }, 2, 200);

      if (!response.data || response.data.success !== true || !Array.isArray(response.data.data)) {
        throw new Error('TV series API returned invalid payload structure');
      }

      fileslug = response.data.data[0]?.fileslug;
      if (!fileslug) {
        throw new Error('Fileslug/SVID not found in series API response');
      }

      resolverCache.set(cacheKey, fileslug, 900); // Cache for 15 minutes
    }

    return await fetchEmbedHelperProviders(fileslug, context);
  }
}

/**
 * Stage 2: Call Movie API to resolve to SVID
 */
class MovieStrategy implements ResolutionStrategy {
  public name = 'Movie mymovieapi Strategy';

  public canHandle(embedUrl: string): boolean {
    return embedUrl.includes('/movie/') || embedUrl.includes('mymovieapi') || /tt\d+/.test(embedUrl);
  }

  public async resolve(embedUrl: string, context: ResolverContext): Promise<DiscoveredProvider[]> {
    let id = '';
    const imdbMatch = embedUrl.match(/(tt\d+)/);
    
    if (imdbMatch) {
      id = imdbMatch[1];
    } else {
      const match = embedUrl.match(/\/embed\/movie\/([^/?]+)/);
      if (match) {
        id = match[1];
      }
    }

    if (!id) {
      throw new Error('Embed URL does not match movie pattern /embed/movie/ or contains IMDB ID');
    }

    let key = '';
    try {
      const urlObj = new URL(embedUrl);
      key = urlObj.searchParams.get('key') || '';
    } catch {
      // Ignored
    }

    const idType = id.startsWith('tt') ? 'imdbid' : 'tmdbid';

    const cacheKey = `fileslug:movie:${id}`;
    let fileslug = resolverCache.get<string>(cacheKey);

    if (fileslug) {
      context.cache = 'HIT';
      recordCache(true);
    } else {
      recordCache(false);
      const movieApiUrl = `https://streams.iqsmartgames.com/mymovieapi?${idType}=${id}&key=${key}`;
      context.debug(`Querying Movie API: ${movieApiUrl.replace(/key=[^&]+/, 'key=[REDACTED]')}`);

      const response = await fetchWithRetry(movieApiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: embedUrl,
        },
        timeout: 5000,
        httpsAgent: agent,
      }, 2, 200);

      if (!response.data || response.data.success !== true || !Array.isArray(response.data.data)) {
        throw new Error('Movie API returned invalid payload structure');
      }

      fileslug = response.data.data[0]?.fileslug;
      if (!fileslug) {
        throw new Error('Fileslug/SVID not found in movie API response');
      }

      resolverCache.set(cacheKey, fileslug, 900); // Cache for 15 minutes
    }

    return await fetchEmbedHelperProviders(fileslug, context);
  }
}

/**
 * Stage 3: Standard movie SVID extractor fallback
 */
class StandardMovieStrategy implements ResolutionStrategy {
  public name = 'Standard Movie SVID Strategy';

  public canHandle(embedUrl: string): boolean {
    return true; // Catch-all fallback
  }

  public async resolve(embedUrl: string, context: ResolverContext): Promise<DiscoveredProvider[]> {
    let fileId = '';
    try {
      const urlObj = new URL(embedUrl);
      fileId = urlObj.pathname.split('/').filter(Boolean).pop() || '';
    } catch {
      fileId = embedUrl.split('/').filter(Boolean).pop() || '';
    }

    // Strip key query parameters if any
    fileId = fileId.split('?')[0];

    if (!fileId) {
      throw new Error('Could not extract SVID token file ID from embed URL');
    }

    return await fetchEmbedHelperProviders(fileId, context);
  }
}

/**
 * Queries embedhelper.php and extracts discovered providers
 */
async function fetchEmbedHelperProviders(svid: string, context: ResolverContext): Promise<DiscoveredProvider[]> {
  const cacheKey = `embedhelper:${svid}`;
  let data = resolverCache.get<any>(cacheKey);

  if (data) {
    context.cache = 'HIT';
    recordCache(true);
  } else {
    recordCache(false);
    const host = 'https://pro.iqsmartgames.com';
    const formData = new URLSearchParams();
    formData.append('sid', svid);
    formData.append('UserFavSite', '');
    formData.append('currentDomain', 'https://multimovies.watch');

    context.startTiming('EmbedHelper Request');
    const response = await fetchWithRetry(`${host}/embedhelper.php`, {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: `${host}/svid/${svid}`,
      },
      timeout: 5000,
      httpsAgent: agent,
    }, 2, 200);
    context.endTiming('EmbedHelper Request');

    data = response.data;
    if (!data || (!data.siteUrls && !data.providers)) {
      throw new Error('Empty or invalid payload returned from embedhelper.php');
    }

    resolverCache.set(cacheKey, data, 300); // Cache for 5 minutes
  }

  const siteUrls: Record<string, string> = data.siteUrls || data.providers || {};
  let mresult: Record<string, string> = {};

  if (data.mresult) {
    if (typeof data.mresult === 'object') {
      mresult = data.mresult;
    } else {
      try {
        const decoded = Buffer.from(data.mresult, 'base64').toString('utf-8');
        mresult = JSON.parse(decoded);
      } catch (err: any) {
        context.debug(`Failed to parse mresult base64 string`);
      }
    }
  }

  const siteFriendlyNames: Record<string, string> = data.siteFriendlyNames || {};
  const discovered: DiscoveredProvider[] = [];

  for (const key of Object.keys(siteUrls)) {
    const hash = mresult[key];
    if (hash) {
      const baseUrl = siteUrls[key];
      const type = (baseUrl.includes('technocosmos') || baseUrl.includes('hlsplayer') || baseUrl.endsWith('#')) ? 'hls' : 'iframe';
      discovered.push({
        id: key,
        name: siteFriendlyNames[key] || key,
        url: `${baseUrl.replace(/\/$/, '')}/${hash}`,
        type,
      });
    }
  }

  return discovered;
}

/**
 * Validate a final player URL structure
 */
export function validatePlayerUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) return false;
    return parsed.host.length > 3 && parsed.host.includes('.');
  } catch {
    return false;
  }
}

/**
 * Perform provider-specific checks before marking as valid
 */
async function validateAndResolveProvider(provider: DiscoveredProvider): Promise<string> {
  if (provider.type === 'hls') {
    // Resolve master HLS m3u8 playlist file to prove connectivity
    const hlsUrl = await getHlsUrl(provider.url);
    if (!hlsUrl || !hlsUrl.startsWith('http')) {
      throw new Error('Resolved HLS stream URL is empty or invalid');
    }
    // Return standard proxied player URL for playback
    return `https://plyr.technocosmos.surf/hlsplayer?url=${encodeURIComponent(provider.url)}`;
  } else {
    // Perform GET call to direct iframe player to verify status and HTML content
    try {
      const response = await fetchWithRetry(provider.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://multimovies.watch/',
        },
        timeout: 3000,
        httpsAgent: agent,
      }, 0); // No retries for mirror validation checks

      if (response.status === 404 || response.status >= 500) {
        throw new Error(`Iframe provider page returned HTTP status ${response.status}`);
      }

      if (response.status === 200) {
        const body = String(response.data).toLowerCase();
        const hasExpectedElements = 
          body.includes('<html') || 
          body.includes('player') || 
          body.includes('video') || 
          body.includes('iframe') || 
          body.includes('script');
        if (!hasExpectedElements) {
          throw new Error('Iframe page does not contain expected player HTML content');
        }
      }
    } catch (err: any) {
      // Allow Cloudflare/bot blocks (403, 401, etc.) as they prove the domain/mirror is live.
      // Propagate timeouts, 404s, 500s, or connection drops.
      const status = err.response?.status;
      if (status === 403 || status === 401 || status === 400 || status === 302 || status === 301 || status === 405) {
        return provider.url;
      }
      throw err;
    }
    return provider.url;
  }
}

/**
 * Backwards compatible fetch provider list (used in Movie details page route)
 */
export async function getEmbedSources(svidToken: string): Promise<EmbedSource[]> {
  const context = new ResolverContext(svidToken, 'movie');
  const providers = await fetchEmbedHelperProviders(svidToken, context);
  return providers.map(p => ({
    key: p.id,
    name: p.name,
    url: p.url
  }));
}

/**
 * Decrypt Master HLS stream url
 */
export async function getHlsUrl(providerUrl: string): Promise<string> {
  const innerUrlMatch = providerUrl.match(/hlsplayer\?url=([^#]+)/);
  const effectiveUrl = innerUrlMatch ? decodeURIComponent(innerUrlMatch[1]) + '#' + (providerUrl.split('#')[1] || '') : providerUrl;

  const hash = effectiveUrl.split('#').pop()?.split('/').pop() || '';
  const baseUrl = new URL(effectiveUrl).origin;

  const response = await fetchWithRetry(`${baseUrl}/api/v1/video?id=${hash}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://multimovies.watch/',
    },
    timeout: 3000,
    responseType: 'text',
    httpsAgent: agent,
  }, 2, 200);

  const hexCiphertext = response.data.trim();
  if (!hexCiphertext) {
    throw new Error('Empty response payload from provider stream API');
  }

  const decryptedJson = tryDecrypt(hexCiphertext);
  const parsed = JSON.parse(decryptedJson) as { source?: string };

  const m3u8Url = parsed.source?.replace(/\\\//g, '/');
  if (!m3u8Url) {
    throw new Error('Decrypted payload did not contain source URL');
  }

  return m3u8Url;
}

/**
 * Resiliently select Wordpress Post ID from raw HTML string
 */
export async function extractResilientPostId(html: string): Promise<number | null> {
  // Regex 1: Post ID body class
  const bodyMatch = html.match(/postid[-\s](\d+)/i);
  if (bodyMatch) return parseInt(bodyMatch[1], 10);

  // Regex 2: data-post attribute
  const dataPostMatch = html.match(/data-post=['"](\d+)['"]/);
  if (dataPostMatch) return parseInt(dataPostMatch[1], 10);

  // Regex 3: Shortlink meta p parameter
  const shortlinkMatch = html.match(/<link\s+rel=['"]shortlink['"]\s+href=['"][^'"]*\?p=(\d+)/i);
  if (shortlinkMatch) return parseInt(shortlinkMatch[1], 10);

  try {
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    const href = $('link[rel="shortlink"]').attr('href');
    if (href) {
      const pMatch = href.match(/\?p=(\d+)/);
      if (pMatch) return parseInt(pMatch[1], 10);
    }

    const dataPost = $('[data-post]').first().attr('data-post');
    if (dataPost && /^\d+$/.test(dataPost)) return parseInt(dataPost, 10);

    const dataId = $('[data-id]').first().attr('data-id');
    if (dataId && /^\d+$/.test(dataId)) return parseInt(dataId, 10);

    const scriptMatch = html.match(/["']post_id["']\s*:\s*["'](\d+)["']/);
    if (scriptMatch) return parseInt(scriptMatch[1], 10);
  } catch {
    // Fallback
  }

  return null;
}

/**
 * Decodes URL encoding safely, catching errors for malformed % sequences
 */
function safeDecodeURI(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str
      .replace(/%3C/gi, '<')
      .replace(/%3E/gi, '>')
      .replace(/%22/gi, '"')
      .replace(/%27/gi, "'")
      .replace(/%20/gi, ' ')
      .replace(/%2F/gi, '/')
      .replace(/%3D/gi, '=')
      .replace(/%3F/gi, '?')
      .replace(/%26/gi, '&')
      .replace(/%5C/gi, '\\')
      .replace(/%09/gi, '\t')
      .replace(/%0A/gi, '\n')
      .replace(/%0D/gi, '\r');
  }
}

/**
 * Resolve any embed URL to discovered providers using registered strategies
 */
async function resolveEmbedUrlToProviders(embedUrl: string, context: ResolverContext): Promise<DiscoveredProvider[]> {
  const strategies: ResolutionStrategy[] = [
    new TVShowStrategy(),
    new MovieStrategy(),
    new StandardMovieStrategy()
  ];

  for (const strat of strategies) {
    if (strat.canHandle(embedUrl)) {
      const startStrat = Date.now();
      try {
        context.debug(`Trying strategy: ${strat.name}`);
        const providers = await strat.resolve(embedUrl, context);
        if (providers && providers.length > 0) {
          context.logStage(strat.name, 'success', Date.now() - startStrat);
          return providers;
        }
      } catch (err: any) {
        context.logStage(strat.name, 'failed', Date.now() - startStrat, err.message);
      }
    }
  }

  return [];
}

/**
 * Core Resolver Engine: takes an embed URL and attempts to resolve a working player
 */
export async function resolveEmbedUrl(
  embedUrl: string,
  slug: string,
  type: 'movie' | 'tv',
  context?: ResolverContext
): Promise<ResolutionResult> {
  const ctx = context || new ResolverContext(slug, type);

  let cleanedUrl = embedUrl.trim();

  // Try decoding URL encoding safely
  cleanedUrl = safeDecodeURI(cleanedUrl);

  // Decode HTML entities
  cleanedUrl = cleanedUrl
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");

  // Extract src from iframe HTML string if present (case-insensitive and resilient to quote styles)
  if (cleanedUrl.includes('<iframe') || cleanedUrl.includes('<IFRAME')) {
    const srcMatch = cleanedUrl.match(/src=(?:["']([^"']+)["']|([^\s>]+))/i);
    const src = srcMatch ? (srcMatch[1] || srcMatch[2]) : '';
    if (src) {
      cleanedUrl = src;
    }
  }

  // Clean up all whitespaces, tabs, backslashes, or literal '\t' strings inside the URL
  cleanedUrl = cleanedUrl.replace(/\s+/g, '').replace(/\\t/gi, '').replace(/\\/g, '');

  if (cleanedUrl.startsWith('//')) {
    cleanedUrl = 'https:' + cleanedUrl;
  }

  // Standardize query params
  cleanedUrl = cleanedUrl.replace(/&amp;/g, '&');

  // Check if it is a direct third-party player
  const isResolverDomain = 
    cleanedUrl.includes('iqsmartgames.com') || 
    cleanedUrl.includes('gdmirrorbot.nl') || 
    cleanedUrl.includes('multimovies.watch') || 
    cleanedUrl.startsWith('/') ||
    cleanedUrl.startsWith('.');

  if (!isResolverDomain) {
    ctx.debug(`Direct third-party player detected: ${cleanedUrl}. Skipping resolution pipeline.`);
    
    let isValid = false;
    ctx.startTiming('Direct Player Validation');
    try {
      const response = await fetchWithRetry(cleanedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Referer: 'https://multimovies.watch/',
        },
        timeout: 3000,
        httpsAgent: agent,
      }, 0);
      if (response.status >= 200 && response.status < 400) {
        isValid = true;
      }
    } catch (e: any) {
      ctx.debug(`Direct player validation failed for ${cleanedUrl}: ${e.message}`);
    }
    const valTime = ctx.endTiming('Direct Player Validation', isValid ? 'success' : 'failed');

    if (isValid && validatePlayerUrl(cleanedUrl)) {
      ctx.printSummary(true, 'DirectThirdParty', 'DirectBypass');
      recordRequest(true, Date.now() - ctx.startTime, valTime);
      return {
        playerUrl: cleanedUrl,
        meta: {
          provider: 'DirectThirdParty',
          strategy: 'DirectBypass',
          validated: true,
          responseTime: valTime,
          retries: 0
        }
      };
    }
  }

  ctx.startTiming('Embed Resolution');
  const providers = await resolveEmbedUrlToProviders(cleanedUrl, ctx);
  ctx.endTiming('Embed Resolution', providers.length > 0 ? 'success' : 'failed');

  if (providers.length === 0) {
    ctx.printSummary(false);
    recordRequest(false, Date.now() - ctx.startTime, 0);
    throw new ResolutionError('provider-resolution', []);
  }

  // Sequenced validation with automatic retry failover loop
  const diagnostics: Array<{ name: string; status: string }> = [];
  ctx.startTiming('Provider Validation Loop');
  const valStart = Date.now();

  for (const prov of providers) {
    let attempts = 0;
    const maxAttempts = 2; // Up to 2 attempts (retry once)

    while (attempts < maxAttempts) {
      attempts++;
      const startVal = Date.now();
      ctx.debug(`Attempting provider check: ${prov.name} (${prov.id}) | Attempt: ${attempts}/${maxAttempts}`);
      
      try {
        const finalUrl = await validateAndResolveProvider(prov);
        const resTime = Date.now() - startVal;

        if (validatePlayerUrl(finalUrl)) {
          ctx.logProvider(prov.name, prov.id, 'success', resTime);
          ctx.endTiming('Provider Validation Loop', 'success');
          
          const successStrategy = ctx.stages.find(s => s.status === 'success' && s.name.includes('Strategy'))?.name || 'UnknownStrategy';
          ctx.printSummary(true, prov.name, successStrategy);

          recordProvider(prov.name, true, resTime);
          recordRequest(true, Date.now() - ctx.startTime, Date.now() - valStart);

          return {
            playerUrl: finalUrl,
            meta: {
              provider: prov.name,
              strategy: successStrategy,
              validated: true,
              responseTime: resTime,
              retries: attempts - 1
            }
          };
        } else {
          throw new Error('Validated URL failed final URL check');
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        const cleanStatus = errMsg.includes('403') ? '403' : errMsg.includes('404') ? '404' : errMsg.includes('timeout') ? 'Timeout' : errMsg;
        const resTime = Date.now() - startVal;

        ctx.debug(`Provider ${prov.name} check failed on attempt ${attempts}: ${errMsg}`);

        if (attempts === maxAttempts) {
          ctx.logProvider(prov.name, prov.id, cleanStatus, resTime);
          diagnostics.push({ name: prov.name, status: cleanStatus });
          recordProvider(prov.name, false, resTime, errMsg);
        }
      }
    }
  }

  ctx.endTiming('Provider Validation Loop', 'failed', 'All providers failed');
  ctx.printSummary(false);

  recordRequest(false, Date.now() - ctx.startTime, Date.now() - valStart);
  throw new ResolutionError('provider-resolution', diagnostics);
}

/**
 * Resolve a WordPress post ID to an iframe player URL by checking all providers.
 */
export async function resolvePostIdToPlayerUrl(
  postId: number,
  options?: { type?: string; nume?: string },
  context?: ResolverContext
): Promise<ResolutionResult> {
  const type = options?.type || 'movie';
  const nume = options?.nume || '1';
  const ctx = context || new ResolverContext(`${type}_${postId}_${nume}`, type === 'tv' ? 'tv' : 'movie');

  // Caching Wordpress Ajax call
  const cacheKey = `ajax:${postId}:${type}:${nume}`;
  let embedUrl = resolverCache.get<string>(cacheKey);

  if (embedUrl) {
    ctx.cache = 'HIT';
    recordCache(true);
  } else {
    recordCache(false);
    const embedForm = new URLSearchParams();
    embedForm.append('action', 'doo_player_ajax');
    embedForm.append('post', String(postId));
    embedForm.append('nume', nume);
    embedForm.append('type', type);

    ctx.startTiming('WordPress Admin Ajax');
    const epResp = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: embedForm,
    });

    if (!epResp.ok) {
      ctx.endTiming('WordPress Admin Ajax', 'failed', `HTTP status ${epResp.status}`);
      throw new Error(`admin-ajax post returned status ${epResp.status}`);
    }

    const epData = (await epResp.json()) as AjaxResponse;
    embedUrl = epData.embed_url || null;
    ctx.endTiming('WordPress Admin Ajax');

    if (!embedUrl) {
      throw new Error('Wordpress admin-ajax failed to return embed_url');
    }
    resolverCache.set(cacheKey, embedUrl, 300); // Cache for 5 minutes
  }

  return resolveEmbedUrl(embedUrl, `${type}_${postId}_${nume}`, type === 'tv' ? 'tv' : 'movie', ctx);
}

/**
 * Backwards compatible HLS resolver
 */
export async function resolveSvidToHls(svidToken: string): Promise<string> {
  const context = new ResolverContext(svidToken, 'movie');
  const providers = await fetchEmbedHelperProviders(svidToken, context);
  if (providers.length === 0) throw new Error('No sources found');

  for (const prov of providers) {
    try {
      if (prov.type === 'hls') {
        return await getHlsUrl(prov.url);
      }
    } catch {
      continue;
    }
  }
  throw new Error('All sources failed to resolve HLS URL');
}