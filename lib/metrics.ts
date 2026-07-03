// lib/metrics.ts

export interface ProviderStats {
  successCount: number;
  failureCount: number;
  totalTime: number;
  timeouts: number;
  statusCodes: Record<number, number>;
}

export interface ResolverMetrics {
  totalRequests: number;
  successes: number;
  failures: number;
  totalResolveTime: number;
  totalValidationTime: number;
  cacheHits: number;
  cacheMisses: number;
  providers: Record<string, ProviderStats>;
}

// Global metrics container to survive hot reload container resets in dev/prod
const globalRef = global as any;
if (!globalRef._resolverMetrics) {
  globalRef._resolverMetrics = {
    totalRequests: 0,
    successes: 0,
    failures: 0,
    totalResolveTime: 0,
    totalValidationTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    providers: {},
  };
}

export const metrics: ResolverMetrics = globalRef._resolverMetrics;

export function recordRequest(success: boolean, duration: number, validationDuration: number) {
  metrics.totalRequests++;
  if (success) {
    metrics.successes++;
  } else {
    metrics.failures++;
  }
  metrics.totalResolveTime += duration;
  metrics.totalValidationTime += validationDuration;
}

export function recordCache(hit: boolean) {
  if (hit) {
    metrics.cacheHits++;
  } else {
    metrics.cacheMisses++;
  }
}

export function recordProvider(name: string, success: boolean, duration: number, errorMsg?: string) {
  if (!metrics.providers[name]) {
    metrics.providers[name] = {
      successCount: 0,
      failureCount: 0,
      totalTime: 0,
      timeouts: 0,
      statusCodes: {},
    };
  }
  const p = metrics.providers[name];
  p.totalTime += duration;
  if (success) {
    p.successCount++;
  } else {
    p.failureCount++;
    if (errorMsg) {
      const lower = errorMsg.toLowerCase();
      if (lower.includes('timeout') || lower.includes('etimedout')) {
        p.timeouts++;
      }
      const codeMatch = errorMsg.match(/status code (\d+)/i) || errorMsg.match(/status (\d+)/i);
      if (codeMatch) {
        const code = parseInt(codeMatch[1], 10);
        p.statusCodes[code] = (p.statusCodes[code] || 0) + 1;
      }
    }
  }
}
