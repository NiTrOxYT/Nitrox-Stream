import axios from 'axios';
import { LiveProvider } from '../lib/provider';
import { resolvePostIdToPlayerUrl, resolveEmbedUrl, ResolutionError, validatePlayerUrl } from '../lib/embedHelper';
import { resolverCache } from '../lib/cache';

const MOVIES = [
  'avatar-the-way-of-water',
  'avatar',
  'dune-part-two',
  'dune',
  'the-marvels',
  'watch-out-were-mad',
  'welcome-to-the-jungle',
  'mahavatar-narsimha',
  'little-brother',
  'avatar-fire-and-ash'
];

const EPISODES = [
  'avatar-the-last-airbender-1x1',
  'dune-prophecy-1x1',
  'the-agency-1x1',
  'love-like-the-galaxy-1x1',
  'ms-marvel-1x1',
  'man-on-fire-1x1',
  'the-terminal-list-dark-wolf-1x1',
  'dark-moon-the-blood-altar-1x1',
  'theatre-of-darkness-yamishibai-1x1',
  'the-daily-life-of-the-immortal-king-5x9'
];

const INVALID_SLUG = 'invalid-slug-12345-not-real';

async function testMovies(provider: LiveProvider) {
  console.log('\n--- TESTING MOVIES ---');
  let passed = 0;
  for (const slug of MOVIES) {
    const start = Date.now();
    try {
      console.log(`[Test] Resolving Movie: ${slug}`);
      const movie = await provider.getMovie(slug);
      if (!movie) {
        throw new Error(`Movie not found in provider`);
      }
      if (!movie.playerUrl) {
        throw new Error(`No playerUrl found on movie page`);
      }
      const res = await resolveEmbedUrl(movie.playerUrl, slug, 'movie');
      console.log(`[Test] SUCCESS: ${slug} -> ${res.playerUrl} (${Date.now() - start}ms) | Provider: ${res.meta.provider} | Strategy: ${res.meta.strategy} | Retries: ${res.meta.retries}`);
      passed++;
    } catch (e: any) {
      console.error(`[Test] FAILED: ${slug} ->`, e.message);
    }
  }
  console.log(`Movies Passed: ${passed}/${MOVIES.length}`);
  return passed === MOVIES.length;
}

async function testEpisodes(provider: LiveProvider) {
  console.log('\n--- TESTING EPISODES ---');
  let passed = 0;
  for (const slug of EPISODES) {
    const start = Date.now();
    try {
      console.log(`[Test] Resolving Episode: ${slug}`);
      const postId = await provider.getEpisodePostId(slug);
      if (!postId) {
        throw new Error(`Episode post ID not found`);
      }
      const res = await resolvePostIdToPlayerUrl(postId, { type: 'tv' });
      console.log(`[Test] SUCCESS: ${slug} -> ${res.playerUrl} (${Date.now() - start}ms) | Provider: ${res.meta.provider} | Strategy: ${res.meta.strategy} | Retries: ${res.meta.retries}`);
      passed++;
    } catch (e: any) {
      console.error(`[Test] FAILED: ${slug} ->`, e.message);
    }
  }
  console.log(`Episodes Passed: ${passed}/${EPISODES.length}`);
  return passed === EPISODES.length;
}

async function testInvalid(provider: LiveProvider) {
  console.log('\n--- TESTING INVALID SLUG ---');
  try {
    const postId = await provider.getEpisodePostId(INVALID_SLUG);
    if (!postId) {
      console.log(`[Test] SUCCESS: Invalid slug ${INVALID_SLUG} correctly returned no post ID`);
      return true;
    }
    // If it returned post ID, try resolving it (should fail)
    await resolvePostIdToPlayerUrl(postId, { type: 'tv' });
    console.error(`[Test] FAILED: Invalid slug resolved to player URL!`);
    return false;
  } catch (err: any) {
    if (err instanceof ResolutionError) {
      console.log(`[Test] SUCCESS: Invalid slug failed with ResolutionError diagnostics:`, JSON.stringify(err.providers));
      return true;
    }
    console.log(`[Test] SUCCESS: Invalid slug failed as expected:`, err.message);
    return true;
  }
}

async function runSimulations() {
  console.log('\n--- RUNNING FAULT-TOLERANCE SIMULATIONS ---');
  let passed = 0;

  const originalGet = axios.get;
  const originalPost = axios.post;

  // 1. Timeout simulation
  resolverCache.clear();
  try {
    axios.get = (async () => { throw new Error('timeout'); }) as any;
    console.log('[Sim] 1. Timeout / slow provider failover...');
    await resolveEmbedUrl('https://streams.iqsmartgames.com/embed/movie/tt12345', 'mock-slug', 'movie');
    console.error('[Sim] FAILED: Timeout resolution succeeded unexpectedly');
  } catch (err: any) {
    if (err instanceof ResolutionError) {
      console.log('[Sim] PASS: Timeout correctly failed with ResolutionError');
      passed++;
    } else {
      console.error('[Sim] FAILED: Unexpected error type:', err.message);
    }
  }

  // 2. Dead mirror (status code 404 / 500)
  resolverCache.clear();
  try {
    axios.get = (async () => { return { status: 404, data: 'Not Found' }; }) as any;
    console.log('[Sim] 2. Dead mirror status validation...');
    await resolveEmbedUrl('https://streams.iqsmartgames.com/embed/movie/tt12345', 'mock-slug', 'movie');
    console.error('[Sim] FAILED: Dead mirror resolution succeeded unexpectedly');
  } catch (err: any) {
    if (err instanceof ResolutionError) {
      console.log('[Sim] PASS: Dead mirror correctly failed with ResolutionError');
      passed++;
    } else {
      console.error('[Sim] FAILED: Unexpected error type:', err.message);
    }
  }

  // 3. Malformed embed response / missing siteUrls
  resolverCache.clear();
  try {
    axios.post = (async () => { return { data: {} }; }) as any; // Empty payload, no siteUrls
    console.log('[Sim] 3. Missing siteUrls and metadata...');
    await resolveEmbedUrl('https://streams.iqsmartgames.com/embed/movie/tt12345', 'mock-slug', 'movie');
    console.error('[Sim] FAILED: Malformed response resolved successfully');
  } catch (err: any) {
    console.log('[Sim] PASS: Malformed response caught successfully:', err.message);
    passed++;
  }

  // 4. Complex Provider Failover and Unknown Provider Type Simulation
  resolverCache.clear();
  try {
    axios.post = (async () => {
      return {
        data: {
          siteUrls: {
            "dead_prov": "https://dead-domain.com/e/",
            "unknown_prov": "https://unknown-domain.com/e/"
          },
          mresult: "eyJkZWFkX3Byb3YiOiJkZWFkX2hhc2giLCJ1bmtub3duX3Byb3YiOiJ1bmtub3duX2hhc2gifQ=="
        }
      };
    }) as any;

    axios.get = (async (url: string) => {
      if (url.includes('mymovieapi')) {
        return {
          status: 200,
          data: {
            success: true,
            data: [{ fileslug: 'tt12345' }]
          }
        } as any;
      }
      if (url.includes('dead-domain.com')) {
        return { status: 500, data: 'Internal Server Error' } as any;
      }
      if (url.includes('unknown-domain.com')) {
        return { status: 200, data: '<html><body><div id="player"></div></body></html>' } as any;
      }
      throw new Error('Not mocked url: ' + url);
    }) as any;

    console.log('[Sim] 4. Complex failover and validation of unknown provider...');
    const res = await resolveEmbedUrl('https://streams.iqsmartgames.com/embed/movie/tt12345', 'mock-slug', 'movie');
    if (res.playerUrl === 'https://unknown-domain.com/e/unknown_hash') {
      console.log('[Sim] PASS: Successfully failed over dead_prov and validated unknown_prov');
      passed++;
    } else {
      console.error('[Sim] FAILED: Unexpected resolved URL:', res.playerUrl);
    }
  } catch (err: any) {
    console.error('[Sim] FAILED:', err.message);
  }

  // Restore original axios methods
  axios.get = originalGet;
  axios.post = originalPost;

  console.log(`Simulations Passed: ${passed}/4`);
  return passed === 4;
}

async function run() {
  const provider = new LiveProvider();
  const start = Date.now();
  console.log('Starting Nitrox Stream Resolver Regression Tests...');

  const moviesOk = await testMovies(provider);
  const episodesOk = await testEpisodes(provider);
  const invalidOk = await testInvalid(provider);
  const simsOk = await runSimulations();

  const totalTime = Date.now() - start;
  console.log(`\n==================================================`);
  console.log(`REGRESSION SUMMARY`);
  console.log(`==================================================`);
  console.log(`Movies:      ${moviesOk ? 'PASS' : 'FAIL'}`);
  console.log(`Episodes:    ${episodesOk ? 'PASS' : 'FAIL'}`);
  console.log(`Invalid:     ${invalidOk ? 'PASS' : 'FAIL'}`);
  console.log(`Simulations: ${simsOk ? 'PASS' : 'FAIL'}`);
  console.log(`Total Time:  ${totalTime}ms`);
  console.log(`==================================================`);

  if (!moviesOk || !episodesOk || !invalidOk || !simsOk) {
    console.error('Regression tests failed!');
    process.exit(1);
  } else {
    console.log('All regression tests passed successfully!');
    process.exit(0);
  }
}

run();
