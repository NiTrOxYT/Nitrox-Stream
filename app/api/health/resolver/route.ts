import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';
import { resolveEmbedUrl, resolvePostIdToPlayerUrl } from '@/lib/embedHelper';
import { metrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  const provider = new LiveProvider();

  const testMovies = ['avatar', 'dune'];
  const testEpisodes = [
    'avatar-the-last-airbender-1x1',
    'the-daily-life-of-the-immortal-king-5x9'
  ];

  let moviesResolved = 0;
  let episodesResolved = 0;
  let failed = 0;
  let totalMs = 0;

  const resolveMovie = async (slug: string) => {
    const start = Date.now();
    try {
      const movie = await provider.getMovie(slug);
      if (!movie || !movie.playerUrl) throw new Error('No player URL');
      const result = await resolveEmbedUrl(movie.playerUrl, slug, 'movie');
      if (result && result.playerUrl) {
        moviesResolved++;
        totalMs += (Date.now() - start);
      } else {
        throw new Error('No player URL resolved');
      }
    } catch {
      failed++;
    }
  };

  const resolveEpisode = async (slug: string) => {
    const start = Date.now();
    try {
      const postId = await provider.getEpisodePostId(slug);
      if (!postId) throw new Error('No post ID');
      const result = await resolvePostIdToPlayerUrl(postId, { type: 'tv' });
      if (result && result.playerUrl) {
        episodesResolved++;
        totalMs += (Date.now() - start);
      } else {
        throw new Error('No player URL resolved');
      }
    } catch {
      failed++;
    }
  };

  // Run in parallel
  await Promise.all([
    ...testMovies.map(resolveMovie),
    ...testEpisodes.map(resolveEpisode)
  ]);

  const totalSuccessful = moviesResolved + episodesResolved;
  const avgResolveMs = totalSuccessful > 0 ? Math.round(totalMs / totalSuccessful) : 0;
  const status = failed > 0 ? 'degraded' : 'healthy';

  // Compute cache hit ratio
  const cacheTotal = metrics.cacheHits + metrics.cacheMisses;
  const cacheHitRatio = cacheTotal > 0 ? Number((metrics.cacheHits / cacheTotal).toFixed(2)) : 0;

  // Format provider stats
  const providerReport: Record<string, any> = {};
  for (const [name, stats] of Object.entries(metrics.providers)) {
    const total = stats.successCount + stats.failureCount;
    const successRate = total > 0 ? Math.round((stats.successCount / total) * 100) : 0;
    const avgTime = stats.successCount > 0 ? Math.round(stats.totalTime / stats.successCount) : 0;
    providerReport[name] = {
      successRate: `${successRate}%`,
      avgResponseTimeMs: avgTime,
      failures: stats.failureCount,
      timeouts: stats.timeouts,
      statusCodes: stats.statusCodes,
    };
  }

  // Timing metrics
  const avgSystemResolveTime = metrics.successes > 0 ? Math.round(metrics.totalResolveTime / metrics.successes) : 0;
  const avgSystemValidationTime = metrics.successes > 0 ? Math.round(metrics.totalValidationTime / metrics.successes) : 0;

  return NextResponse.json({
    status,
    buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || '1.0.0',
    nodeVersion: process.version,
    resolverVersion: '2.0.0-hardened',
    metrics: {
      totalRequests: metrics.totalRequests,
      successes: metrics.successes,
      failures: metrics.failures,
      avgResolveTimeMs: avgSystemResolveTime,
      avgValidationTimeMs: avgSystemValidationTime,
      cache: {
        hits: metrics.cacheHits,
        misses: metrics.cacheMisses,
        hitRatio: cacheHitRatio,
      },
    },
    providerStatistics: providerReport,
    tests: {
      moviesChecked: testMovies.length,
      moviesPassed: moviesResolved,
      episodesChecked: testEpisodes.length,
      episodesPassed: episodesResolved,
      failedTestsCount: failed,
    }
  });
}
