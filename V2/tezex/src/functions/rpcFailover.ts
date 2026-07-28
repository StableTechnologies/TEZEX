import {
  HttpBackend,
  HttpRequestFailed,
  HttpRequestOptions,
  HttpResponseError,
  HttpTimeoutError,
} from "@taquito/http-utils";
import { RpcClient } from "@taquito/rpc";
import { MichelCodecPacker, TezosToolkit } from "@taquito/taquito";
import type { NetworkInfo } from "../contexts/network";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 4_000;
const RETRIABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);

export interface RpcFailoverOptions {
  primaryUrl: string;
  fallbackUrls?: string[];
  expectedChainId: string;
  requestTimeoutMs?: number;
  healthCheckTimeoutMs?: number;
  onEndpointChange?: (rpcUrl: string) => void;
}

function normalizeRpcUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function isRpcAvailabilityError(error: unknown): boolean {
  if (error instanceof HttpRequestFailed || error instanceof HttpTimeoutError) {
    return true;
  }

  return (
    error instanceof HttpResponseError &&
    RETRIABLE_STATUS_CODES.has(Number(error.status))
  );
}

export function isSafeToFailOver(options: HttpRequestOptions): boolean {
  const method = options.method ?? "GET";
  if (method === "GET") return true;
  if (method !== "POST") return false;

  let path = options.url;
  try {
    path = new URL(options.url).pathname;
  } catch {
    // The RPC client normally supplies an absolute URL. Keeping the original
    // string still lets the suffix checks below behave safely in tests.
  }

  return [
    "/helpers/forge/operations",
    "/helpers/preapply/operations",
    "/helpers/scripts/simulate_operation",
    "/helpers/scripts/run_operation",
    "/helpers/scripts/run_code",
    "/helpers/scripts/run_view",
    "/helpers/scripts/run_script_view",
    "/helpers/scripts/pack_data",
  ].some((suffix) => path.endsWith(suffix));
}

export class FailoverHttpBackend extends HttpBackend {
  private readonly endpoints: string[];
  private readonly expectedChainId: string;
  private readonly healthCheckTimeoutMs: number;
  private readonly onEndpointChange?: (rpcUrl: string) => void;
  private readonly validatedEndpoints = new Set<string>();
  private activeEndpointIndex = 0;

  constructor(options: RpcFailoverOptions) {
    super(options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
    this.endpoints = Array.from(
      new Set(
        [options.primaryUrl, ...(options.fallbackUrls ?? [])].map(
          normalizeRpcUrl
        )
      )
    );
    this.expectedChainId = options.expectedChainId;
    this.healthCheckTimeoutMs =
      options.healthCheckTimeoutMs ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
    this.onEndpointChange = options.onEndpointChange;
    this.validatedEndpoints.add(this.endpoints[0]);
  }

  getActiveRpcUrl(): string {
    return this.endpoints[this.activeEndpointIndex];
  }

  protected requestEndpoint<T>(
    options: HttpRequestOptions,
    data?: object | string
  ): Promise<T> {
    return super.createRequest<T>(options, data);
  }

  private rewriteUrl(url: string, endpoint: string): string {
    const primaryUrl = this.endpoints[0];
    if (url === primaryUrl) return endpoint;
    if (url.startsWith(`${primaryUrl}/`)) {
      return `${endpoint}${url.slice(primaryUrl.length)}`;
    }
    return url;
  }

  private async endpointMatchesNetwork(endpoint: string): Promise<boolean> {
    if (this.validatedEndpoints.has(endpoint)) return true;

    try {
      const chainId = await this.requestEndpoint<string>({
        url: `${endpoint}/chains/main/chain_id`,
        method: "GET",
        timeout: this.healthCheckTimeoutMs,
      });
      if (chainId !== this.expectedChainId) {
        console.error(
          `[rpc] Refusing ${endpoint}: expected ${this.expectedChainId}, received ${chainId}`
        );
        return false;
      }
      this.validatedEndpoints.add(endpoint);
      return true;
    } catch (error) {
      console.warn(`[rpc] Health check failed for ${endpoint}`, error);
      return false;
    }
  }

  private activateEndpoint(index: number): void {
    if (index === this.activeEndpointIndex) return;
    this.activeEndpointIndex = index;
    const endpoint = this.endpoints[index];
    this.onEndpointChange?.(endpoint);
    console.warn(`[rpc] Switched to fallback endpoint ${endpoint}`);
  }

  async createRequest<T>(
    options: HttpRequestOptions,
    data?: object | string
  ): Promise<T> {
    const activeIndex = this.activeEndpointIndex;
    const activeEndpoint = this.endpoints[activeIndex];

    try {
      return await this.requestEndpoint<T>(
        { ...options, url: this.rewriteUrl(options.url, activeEndpoint) },
        data
      );
    } catch (initialError) {
      if (
        this.endpoints.length === 1 ||
        !isSafeToFailOver(options) ||
        !isRpcAvailabilityError(initialError)
      ) {
        throw initialError;
      }

      for (let offset = 1; offset < this.endpoints.length; offset += 1) {
        const candidateIndex = (activeIndex + offset) % this.endpoints.length;
        const candidate = this.endpoints[candidateIndex];
        if (!(await this.endpointMatchesNetwork(candidate))) continue;

        try {
          const result = await this.requestEndpoint<T>(
            { ...options, url: this.rewriteUrl(options.url, candidate) },
            data
          );
          this.activateEndpoint(candidateIndex);
          return result;
        } catch (candidateError) {
          if (!isRpcAvailabilityError(candidateError)) {
            // The candidate answered on the expected network. Preserve its
            // application-level error, but keep it active so the next request
            // does not stall on the unavailable endpoint again.
            this.activateEndpoint(candidateIndex);
            throw candidateError;
          }
        }
      }

      throw initialError;
    }
  }
}

export function createRpcToolkit(info: NetworkInfo): TezosToolkit {
  const backend = new FailoverHttpBackend({
    primaryUrl: info.tezosServer,
    fallbackUrls: info.rpcFallbacks,
    expectedChainId: info.chainId,
  });
  const rpcClient = new RpcClient(info.tezosServer, "main", backend);
  const toolkit = new TezosToolkit(rpcClient);
  toolkit.setPackerProvider(new MichelCodecPacker());
  return toolkit;
}
