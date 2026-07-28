import {
  HttpRequestOptions,
  HttpResponseError,
  HttpTimeoutError,
} from "@taquito/http-utils";
import {
  FailoverHttpBackend,
  isRpcAvailabilityError,
  isSafeToFailOver,
  RpcFailoverOptions,
} from "./rpcFailover";

type RequestHandler = (
  options: HttpRequestOptions,
  data?: object | string
) => Promise<unknown>;

class TestFailoverBackend extends FailoverHttpBackend {
  readonly requests: HttpRequestOptions[] = [];

  constructor(
    options: RpcFailoverOptions,
    private readonly handler: RequestHandler
  ) {
    super(options);
  }

  protected requestEndpoint<T>(
    options: HttpRequestOptions,
    data?: object | string
  ): Promise<T> {
    this.requests.push(options);
    return this.handler(options, data) as Promise<T>;
  }
}

const primary = "https://primary.example/rpc";
const fallback = "https://fallback.example";
const chainId = "NetXdQprcVkpaWU";
const readRequest: HttpRequestOptions = {
  url: `${primary}/chains/main/blocks/head/header`,
  method: "GET",
};

describe("RPC failover", () => {
  it("keeps using the primary endpoint while it is healthy", async () => {
    const backend = new TestFailoverBackend(
      {
        primaryUrl: primary,
        fallbackUrls: [fallback],
        expectedChainId: chainId,
      },
      async () => ({ level: 1 })
    );

    await expect(backend.createRequest(readRequest)).resolves.toEqual({
      level: 1,
    });
    expect(backend.requests.map(({ url }) => url)).toEqual([readRequest.url]);
    expect(backend.getActiveRpcUrl()).toBe(primary);
  });

  it("verifies the chain before switching and then stays on the fallback", async () => {
    const onEndpointChange = jest.fn();
    const backend = new TestFailoverBackend(
      {
        primaryUrl: primary,
        fallbackUrls: [fallback],
        expectedChainId: chainId,
        onEndpointChange,
      },
      async ({ url }) => {
        if (url.startsWith(primary)) throw new HttpTimeoutError(1000, url);
        if (url.endsWith("/chains/main/chain_id")) return chainId;
        return { level: 2 };
      }
    );

    await expect(backend.createRequest(readRequest)).resolves.toEqual({
      level: 2,
    });
    await expect(backend.createRequest(readRequest)).resolves.toEqual({
      level: 2,
    });
    expect(backend.getActiveRpcUrl()).toBe(fallback);
    expect(onEndpointChange).toHaveBeenCalledTimes(1);
    expect(backend.requests.map(({ url }) => url)).toEqual([
      readRequest.url,
      `${fallback}/chains/main/chain_id`,
      `${fallback}/chains/main/blocks/head/header`,
      `${fallback}/chains/main/blocks/head/header`,
    ]);
  });

  it("refuses a fallback connected to the wrong chain", async () => {
    const backend = new TestFailoverBackend(
      {
        primaryUrl: primary,
        fallbackUrls: [fallback],
        expectedChainId: chainId,
      },
      async ({ url }) => {
        if (url.startsWith(primary)) throw new HttpTimeoutError(1000, url);
        return "NetWrongChain";
      }
    );

    await expect(backend.createRequest(readRequest)).rejects.toBeInstanceOf(
      HttpTimeoutError
    );
    expect(backend.getActiveRpcUrl()).toBe(primary);
  });

  it("does not fail over operation injection or logical RPC errors", async () => {
    const injectionRequest: HttpRequestOptions = {
      url: `${primary}/injection/operation`,
      method: "POST",
    };
    const logicalError = new HttpResponseError(
      "operation rejected",
      500,
      "Internal Server Error",
      "contract error",
      readRequest.url
    );

    expect(isSafeToFailOver(injectionRequest)).toBe(false);
    expect(isRpcAvailabilityError(logicalError)).toBe(false);
  });

  it("keeps a responsive fallback active when it returns a logical error", async () => {
    const logicalError = new HttpResponseError(
      "operation rejected",
      500,
      "Internal Server Error",
      "contract error",
      readRequest.url
    );
    const backend = new TestFailoverBackend(
      {
        primaryUrl: primary,
        fallbackUrls: [fallback],
        expectedChainId: chainId,
      },
      async ({ url }) => {
        if (url.startsWith(primary)) throw new HttpTimeoutError(1000, url);
        if (url.endsWith("/chains/main/chain_id")) return chainId;
        throw logicalError;
      }
    );

    await expect(backend.createRequest(readRequest)).rejects.toBe(logicalError);
    expect(backend.getActiveRpcUrl()).toBe(fallback);
  });

  it("allows failover for simulations but not arbitrary POST requests", () => {
    expect(
      isSafeToFailOver({
        url: `${primary}/chains/main/blocks/head/helpers/scripts/run_operation`,
        method: "POST",
      })
    ).toBe(true);
    expect(
      isSafeToFailOver({ url: `${primary}/admin/change`, method: "POST" })
    ).toBe(false);
  });
});
