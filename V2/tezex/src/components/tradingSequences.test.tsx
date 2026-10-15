import React, { useContext } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import BigNumber from "bignumber.js";
import { NetworkType } from "@airgap/beacon-sdk";
import { DAppClient, AccountInfo } from "@airgap/beacon-dapp";
import { SessionProvider } from "../contexts/session";
import { WalletContext, WalletInfo } from "../contexts/wallet";
import { networks, INetwork } from "../contexts/network";
import { useNetwork } from "../hooks/network";
import { PoolRegistry } from "../adapters/poolRegistry";
import { Home } from "../pages/Home";
import {
  Asset,
  AppConfig,
  Token,
  TransactingComponent,
  TransactionStatus,
} from "../types/general";
import { IPoolAdapter, PoolConfig } from "../types/pools";
import {
  getSwapPath,
  resolveSwapPair,
  resolveLiquidityPair,
} from "../tradeRouting";
import config from "../config/app.json";

jest.mock("../functions/beacon", () => ({
  ...jest.requireActual("../functions/beacon"),
  getBalance: async (
    _kit: unknown,
    _network: unknown,
    _owner: unknown,
    asset: Asset
  ) =>
    jest
      .requireActual("../functions/util")
      .balanceBuilder("1000", asset, false),
}));
let mockId = 0;
jest.mock("uuid", () => ({ v4: () => `sequence-${++mockId}` }));
let wallet: WalletInfo;
let network: INetwork;
let navigate: ReturnType<typeof useNavigate>;
let pathname: string;
const Probe = () => {
  wallet = useContext(WalletContext);
  network = useNetwork();
  navigate = useNavigate();
  pathname = useLocation().pathname;
  return null;
};
let delayQuotes = false;
const pending: { resolve: () => void; reject: () => void }[] = [];
const later = <T,>(value: T): Promise<T> =>
  delayQuotes
    ? new Promise((resolve, reject) =>
        pending.push({
          resolve: () => resolve(value),
          reject: () => reject(new Error("RPC unavailable")),
        })
      )
    : Promise.resolve(value);
const asset = (name: Token) => PoolRegistry.getAsset(name);
const convert = (
  value: BigNumber,
  from: Token,
  to: Token,
  multiplier: number
) =>
  value
    .div(10 ** asset(from).decimals)
    .times(multiplier)
    .times(10 ** asset(to).decimals)
    .integerValue();
const adapter = (pool: PoolConfig): IPoolAdapter =>
  ({
    poolConfig: pool,
    estimateSwap: async (_kit, token, amount) =>
      later({
        inputAmount: amount,
        outputAmount: convert(
          amount,
          token,
          token === pool.tokenA ? pool.tokenB : pool.tokenA,
          token === pool.tokenA ? 2 : 0.5
        ),
      }),
    calculateRequiredTokenForLiquidity: async (_kit, token, amount) =>
      later(
        convert(
          amount,
          token,
          token === pool.tokenA ? pool.tokenB : pool.tokenA,
          token === pool.tokenA ? 2 : 0.5
        )
      ),
    estimateAddLiquidity: async (_kit, _token, a, b) => ({
      tokenAAmount: a,
      tokenBAmount: b,
      lpTokenAmount: new BigNumber(100),
    }),
    estimateRemoveLiquidity: async (_kit, amount) =>
      later({
        lpTokenAmount: amount,
        tokenAAmount: convert(amount, pool.lpToken, pool.tokenA, 1),
        tokenBAmount: convert(amount, pool.lpToken, pool.tokenB, 2),
      }),
  } as IPoolAdapter);
const settle = async (ms = 1000) => {
  // Advance in steps so React can commit between debounce, initialization and quote continuations.
  for (let elapsed = 0; elapsed < ms; elapsed += 100)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
};
const mount = async (path = "/swap/xtz-to-tzbtc") => {
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <SessionProvider config={config as AppConfig}>
        <Probe />
        <Routes>
          <Route path="/swap/:pair" element={<Home path="swap" />} />
          <Route path="/liquidity/:pair" element={<Home path="add" />} />
          <Route
            path="/liquidity/:pair/remove"
            element={<Home path="remove" />}
          />
          <Route path="/away" element={<div>Another screen</div>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>
  );
  await settle();
};
const inputLabel = () =>
  pathname.startsWith("/swap/")
    ? "Swap from amount"
    : pathname.endsWith("/remove")
    ? "LP tokens to redeem amount"
    : "You deposit amount";
const input = () => screen.getByRole("textbox", { name: inputLabel() });
const edit = (value: string) =>
  fireEvent.change(input(), { target: { value } });
const component = () =>
  pathname.startsWith("/swap/")
    ? TransactingComponent.SWAP
    : pathname.endsWith("/remove")
    ? TransactingComponent.REMOVE_LIQUIDITY
    : TransactingComponent.ADD_LIQUIDITY;
const transaction = () => {
  const active = wallet.getActiveTransaction(component());
  if (!active) throw new Error("Expected an active transaction");
  return active;
};
const assertConsistent = () => {
  const t = transaction();
  expect(t).toBeDefined();
  expect(input()).not.toHaveAttribute("readonly");
  expect(
    new BigNumber((input() as HTMLInputElement).value || 0).eq(
      t.sendAmount[0].decimal
    )
  ).toBe(true);
  const slug = pathname.split("/")[2];
  const route = resolveSwapPair(slug, network.getAllPools());
  const pool = route?.pool || resolveLiquidityPair(slug, network.getAllPools());
  expect(t.poolId).toBe(pool?.id);
  expect(t.network).toBe(network.network);
  if (route) {
    expect(t.sendAsset[0].name).toBe(route.sendToken);
    expect(t.receiveAsset[0].name).toBe(route.receiveToken);
    if (t.quote)
      expect(
        screen.getByRole("textbox", { name: "Swap to amount" })
      ).toHaveValue(t.receiveAmount[0].string);
  }
  if (t.sendAmount[0].decimal.gt(0)) expect(t.quote).toBeDefined();
};
beforeEach(() => {
  jest.useFakeTimers();
  delayQuotes = false;
  pending.length = 0;
  PoolRegistry.clear();
  PoolRegistry.initializeFromConfig(
    networks.mainnet.pools,
    networks.mainnet.assets
  );
  jest.spyOn(PoolRegistry, "getAdapter").mockImplementation((id) =>
    (() => {
      const pool = PoolRegistry.getPoolById(id);
      if (!pool) throw new Error("Unknown pool " + id);
      return adapter(pool);
    })()
  );
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("typing then reversing before debounce never applies the old number to the new token", async () => {
  await mount();
  edit("3");
  fireEvent.click(
    screen.getByRole("button", { name: "Reverse swap direction" })
  );
  await settle();
  assertConsistent();
  // There was no completed quote to carry into the reversed input.
  expect(input()).toHaveValue("0.00");
  edit("4");
  await settle();
  assertConsistent();
  expect(screen.getByRole("textbox", { name: "Swap to amount" })).toHaveValue(
    "2"
  );
});
test("leaving immediately after typing preserves the draft when returning", async () => {
  await mount();
  edit("3");
  fireEvent.click(screen.getByRole("tab", { name: "Liquidity", exact: true }));
  await settle();
  fireEvent.click(screen.getByRole("tab", { name: "Swap", exact: true }));
  await settle();
  expect(input()).toHaveValue("3");
  assertConsistent();
});
test("reversing a completed quote then navigating away and back keeps URL and direction aligned", async () => {
  await mount();
  edit("3");
  await settle();
  fireEvent.click(
    screen.getByRole("button", { name: "Reverse swap direction" })
  );
  await settle();
  assertConsistent();
  fireEvent.click(screen.getByRole("tab", { name: "Liquidity", exact: true }));
  await settle();
  fireEvent.click(screen.getByRole("tab", { name: "Swap", exact: true }));
  await settle();
  assertConsistent();
});
test("back and forward after editing and changing pool keep the active pair consistent", async () => {
  await mount();
  edit("3");
  await settle();
  await act(async () => navigate("/swap/usdt-to-tzbtc"));
  await settle();
  edit("4");
  await settle();
  assertConsistent();
  await act(async () => navigate(-1));
  await settle();
  assertConsistent();
  await act(async () => navigate(1));
  await settle();
  assertConsistent();
});
test("a delayed quote cannot overwrite a newer amount or changed direction", async () => {
  await mount();
  delayQuotes = true;
  edit("3");
  await settle();
  fireEvent.click(
    screen.getByRole("button", { name: "Reverse swap direction" })
  );
  await settle();
  delayQuotes = false;
  edit("4");
  await settle();
  await act(async () =>
    pending
      .splice(0)
      .reverse()
      .forEach((p) => p.resolve())
  );
  await settle();
  assertConsistent();
});

test("editing a ready quote invalidates it immediately, before the debounce expires", async () => {
  await mount();
  await act(async () => {
    wallet.syncActiveAccount(new DAppClient({ name: "test" }), {
      address: "tz1-test",
      accountIdentifier: "one",
      network: { type: NetworkType.MAINNET },
    } as AccountInfo);
  });
  await settle();
  edit("3");
  await settle();
  expect(transaction().quote).toBeDefined();
  edit("4");
  await act(async () => {
    await Promise.resolve();
  });
  expect(transaction().sendAmount[0].decimal.toString()).toBe("4");
  expect(transaction().quote).toBeUndefined();
  expect(screen.getByRole("button", { name: "Updating quote" })).toBeDisabled();
  await settle();
  assertConsistent();
});
test("switching modes preserves the chosen swap direction and draft", async () => {
  await mount();
  edit("3");
  await settle();
  fireEvent.click(
    screen.getByRole("button", { name: "Reverse swap direction" })
  );
  await settle();
  const previousPath = pathname;
  const previousValue = (input() as HTMLInputElement).value;
  fireEvent.click(screen.getByRole("tab", { name: "Liquidity", exact: true }));
  await settle();
  fireEvent.click(screen.getByRole("tab", { name: "Swap", exact: true }));
  await settle();
  expect(pathname).toBe(previousPath);
  expect(input()).toHaveValue(previousValue);
  assertConsistent();
});

test("a slow reversed quote never blocks edits or a different form", async () => {
  await mount();
  edit("3");
  await settle();
  delayQuotes = true;
  fireEvent.click(
    screen.getByRole("button", { name: "Reverse swap direction" })
  );
  await settle();
  expect(transaction().sendAsset[0].name).toBe(Token.TzBTC);
  edit("4");
  await act(async () => {
    await Promise.resolve();
  });
  expect(transaction().sendAmount[0].decimal.toString()).toBe("4");
  fireEvent.click(screen.getByRole("tab", { name: "Liquidity", exact: true }));
  await settle();
  expect(input()).not.toHaveAttribute("readonly");
  delayQuotes = false;
  edit("5");
  await settle();
  assertConsistent();
  await act(async () => pending.splice(0).forEach((p) => p.resolve()));
  await settle();
  assertConsistent();
});

const configurations = Object.entries(networks).flatMap(([name, info]) =>
  info.pools.map((pool) => [name, pool.id, pool] as const)
);
test.each(configurations)(
  "%s / %s supports edits, both directions, mode changes and clearing",
  async (name, _id, pool) => {
    await mount();
    if (name !== "mainnet") {
      await act(async () => network.switchNetwork(name as NetworkType));
      await settle();
    }
    await act(async () => navigate(getSwapPath(pool.tokenA, pool.tokenB)));
    await settle();
    edit("2");
    await settle();
    assertConsistent();
    fireEvent.click(
      screen.getByRole("button", { name: "Reverse swap direction" })
    );
    await settle();
    assertConsistent();
    edit("3");
    await settle();
    assertConsistent();
    fireEvent.click(
      screen.getByRole("tab", { name: "Liquidity", exact: true })
    );
    await settle();
    edit("2");
    await settle();
    assertConsistent();
    fireEvent.click(
      screen.getByRole("button", { name: "Switch deposit token order" })
    );
    await settle();
    assertConsistent();
    edit("6");
    await settle();
    assertConsistent();
    fireEvent.click(
      screen.getByRole("tab", { name: "Remove Liquidity", exact: true })
    );
    await settle();
    edit("2");
    await settle();
    assertConsistent();
    edit("");
    await settle();
    assertConsistent();
    expect(transaction().quote).toBeUndefined();
    fireEvent.click(screen.getByRole("tab", { name: "Swap", exact: true }));
    await settle();
    assertConsistent();
  },
  15000
);

test("changing either token during typing or a pending response quotes only the chosen pair", async () => {
  await mount();
  delayQuotes = true;
  edit("3");
  await settle();
  fireEvent.mouseDown(
    screen.getByRole("combobox", { name: "Select swap from" })
  );
  fireEvent.click(screen.getByRole("option", { name: "USDt" }));
  await settle();
  delayQuotes = false;
  edit("4");
  await settle();
  assertConsistent();
  expect(transaction().sendAsset[0].name).toBe(Token.USDt);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Select swap to" }));
  fireEvent.click(screen.getByRole("option", { name: /Tez/ }));
  await settle();
  edit("5");
  await settle();
  await act(async () =>
    pending
      .splice(0)
      .reverse()
      .forEach((p) => p.resolve())
  );
  await settle();
  assertConsistent();
  expect(transaction().receiveAsset[0].name).toBe(Token.XTZ);
});
test("slippage changes invalidate immediately and survive navigation without rounding", async () => {
  await mount();
  edit("3");
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "Custom", exact: true }));
  const custom = screen.getByRole("textbox", {
    name: "Custom slippage percentage",
  });
  fireEvent.change(custom, { target: { value: "0.75" } });
  await act(async () => {
    await Promise.resolve();
  });
  expect(transaction().quote).toBeUndefined();
  await settle();
  expect(transaction().slippage).toBe(0.75);
  expect(screen.getByText("0.75%")).toBeVisible();
  await act(async () => navigate("/away"));
  await settle();
  await act(async () => navigate(-1));
  await settle();
  expect(
    screen.getByRole("textbox", { name: "Custom slippage percentage" })
  ).toHaveValue("0.75");
  fireEvent.change(
    screen.getByRole("textbox", { name: "Custom slippage percentage" }),
    { target: { value: "" } }
  );
  await settle();
  expect(transaction().transactionStatus).toBe(
    TransactionStatus.INVALID_SLIPPAGE
  );
  edit("4");
  await settle();
  expect(transaction().transactionStatus).toBe(
    TransactionStatus.INVALID_SLIPPAGE
  );
  expect(transaction().quote).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "0.5%" }));
  await settle();
  assertConsistent();
});

test("Use Max can be toggled, edited, cleared, and revisited without restoring an old amount", async () => {
  await mount("/liquidity/xtz-tzbtc/remove");
  await act(async () =>
    wallet.syncActiveAccount(new DAppClient({ name: "test" }), {
      address: "tz1-test",
      accountIdentifier: "one",
      network: { type: NetworkType.MAINNET },
    } as AccountInfo)
  );
  await settle();
  edit("2");
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "Use Max" }));
  await settle();
  expect(input()).toHaveValue("1000");
  fireEvent.click(screen.getByRole("button", { name: "Use Max" }));
  await settle();
  edit("3");
  await settle();
  assertConsistent();
  await act(async () => navigate("/away"));
  await settle();
  await act(async () => navigate(-1));
  await settle();
  expect(input()).toHaveValue("3");
  assertConsistent();
  edit("");
  await settle();
  expect(transaction().quote).toBeUndefined();
});
test.each(["account", "disconnect", "network"])(
  "late results cannot restore a draft after a %s change",
  async (kind) => {
    await mount();
    delayQuotes = true;
    edit("3");
    await settle();
    await act(async () => {
      if (kind === "network") network.switchNetwork(NetworkType.SHADOWNET);
      else
        wallet.syncActiveAccount(
          new DAppClient({ name: "test" }),
          kind === "disconnect"
            ? undefined
            : ({
                address: "tz1-new",
                accountIdentifier: "new",
                network: { type: NetworkType.MAINNET },
              } as AccountInfo)
        );
    });
    await settle();
    delayQuotes = false;
    edit("4");
    await settle();
    await act(async () => pending.splice(0).forEach((p) => p.resolve()));
    await settle();
    assertConsistent();
    expect(input()).toHaveValue("4");
  }
);
test("late failure, clearing, and a new edit cannot revive an obsolete quote", async () => {
  const errors = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  await mount();
  delayQuotes = true;
  edit("3");
  await settle();
  edit("");
  await settle();
  await act(async () => pending.splice(0).forEach((p) => p.reject()));
  await settle();
  expect(transaction().quote).toBeUndefined();
  expect(transaction().sendAmount[0].decimal.isZero()).toBe(true);
  delayQuotes = false;
  edit("5");
  await settle();
  assertConsistent();
  errors.mockRestore();
});

const actionNames = [
  "edit",
  "clear",
  "reverse",
  "pair",
  "mode",
  "away",
] as const;
type Action = (typeof actionNames)[number];
const action = async (name: Action) => {
  if (name === "edit") edit("7");
  if (name === "clear") edit("");
  if (name === "reverse")
    fireEvent.click(
      screen.getByRole("button", {
        name: pathname.startsWith("/swap/")
          ? "Reverse swap direction"
          : "Switch deposit token order",
      })
    );
  if (name === "pair")
    await act(async () =>
      navigate(
        pathname.startsWith("/swap/")
          ? "/swap/usdt-to-tzbtc"
          : "/liquidity/usdt-tzbtc"
      )
    );
  if (name === "mode")
    fireEvent.click(
      screen.getByRole("tab", {
        name: pathname.startsWith("/swap/") ? "Liquidity" : "Swap",
        exact: true,
      })
    );
  if (name === "away") {
    await act(async () => navigate("/away"));
    await settle(100);
    await act(async () => navigate(-1));
  }
  await settle(200);
};
test.each(actionNames.flatMap((a) => actionNames.map((b) => [a, b] as const)))(
  "pending quote → %s → %s keeps the latest intent",
  async (a, b) => {
    await mount();
    delayQuotes = true;
    edit("3");
    await settle();
    await action(a);
    await action(b);
    delayQuotes = false;
    // Complete old requests in reverse order, then make a final edit. No old
    // response may change the chosen route, token identities, or that amount.
    await act(async () =>
      pending
        .splice(0)
        .reverse()
        .forEach((p) => p.resolve())
    );
    await settle();
    assertConsistent();
    edit("9");
    await settle();
    assertConsistent();
    expect(input()).toHaveValue("9");
  }
);

test("partial decimals, backspace and malformed pastes do not reinterpret the amount", async () => {
  await mount();
  edit(".");
  expect(input()).toHaveValue(".");
  edit(".1");
  await settle();
  expect(input()).toHaveValue(".1");
  assertConsistent();
  edit("0.000001");
  await settle();
  assertConsistent();
  for (const invalid of ["-2", "1e3", "2abc", "1.2.3", "0.0000001"]) {
    edit(invalid);
    expect(input()).toHaveValue("0.000001");
  }
  edit("");
  fireEvent.blur(input());
  await settle();
  expect(input()).toHaveValue("0.00");
  expect(transaction().quote).toBeUndefined();
});

test.each([11, 29, 47, 83])(
  "long mixed sequence remains consistent (seed %s)",
  async (seed) => {
    await mount();
    let state = seed;
    for (let step = 0; step < 12; step++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      await action(actionNames[state % actionNames.length]);
      await settle();
      assertConsistent();
    }
  },
  // Twelve complete jsdom screen transitions can exceed Jest's 5s default.
  15000
);
test("leaving during a screen animation cancels its delayed navigation", async () => {
  const original = HTMLElement.prototype.animate;
  const finishers: (() => void)[] = [];
  HTMLElement.prototype.animate = jest.fn(
    () =>
      ({
        finished: new Promise<void>((resolve) => finishers.push(resolve)),
        cancel: jest.fn(),
      } as unknown as Animation)
  );
  try {
    await mount();
    edit("3");
    fireEvent.click(
      screen.getByRole("tab", { name: "Liquidity", exact: true })
    );
    await settle(100);
    await act(async () => navigate("/away"));
    await act(async () => finishers.forEach((f) => f()));
    await settle();
    expect(pathname).toBe("/away");
    await act(async () => navigate(-1));
    await settle();
    expect(input()).toHaveValue("3");
    assertConsistent();
  } finally {
    HTMLElement.prototype.animate = original;
  }
});
test.each(["swap", "add", "remove"])(
  "a submitted %s operation survives changing other screens and pools",
  async (mode) => {
    await mount(
      mode === "swap"
        ? "/swap/xtz-to-tzbtc"
        : `/liquidity/xtz-tzbtc${mode === "remove" ? "/remove" : ""}`
    );
    edit("3");
    await settle();
    const id = transaction().id;
    const activeComponent = component();
    await act(async () =>
      wallet.updateStatus(activeComponent, TransactionStatus.SUBMITTED)
    );
    await settle();
    expect(input()).toHaveAttribute("readonly");
    await act(async () =>
      navigate(mode === "swap" ? "/liquidity/xtz-tzbtc" : "/swap/xtz-to-tzbtc")
    );
    await settle();
    fireEvent.mouseDown(
      screen.getByRole("combobox", {
        name: mode === "swap" ? "Select liquidity pool" : "Select swap from",
      })
    );
    fireEvent.click(
      screen.getByRole("option", {
        name: mode === "swap" ? /USDt.*tzBTC/ : "USDt",
      })
    );
    await settle();
    await act(async () =>
      navigate(
        mode === "swap"
          ? "/swap/usdt-to-tzbtc"
          : `/liquidity/usdt-tzbtc${mode === "remove" ? "/remove" : ""}`
      )
    );
    await settle();
    expect(transaction().id).toBe(id);
    expect(transaction().transactionStatus).toBe(TransactionStatus.SUBMITTED);
    expect(input()).toHaveAttribute("readonly");
    expect(transaction().poolId).toBe("xtz-tzbtc-sirius");
    expect(pathname).toContain(mode === "swap" ? "xtz-to-tzbtc" : "xtz-tzbtc");
  }
);

test("integer pool-share estimates keep trailing zeros", async () => {
  await mount("/liquidity/xtz-tzbtc");
  edit("2");
  await settle();
  expect(screen.getByText("100 Sirs")).toBeVisible();
});

test("a balance refresh queued behind an edit cannot restore the previous ready status", async () => {
  await mount();
  edit("3");
  await settle();
  await act(async () => {
    edit("4");
    await wallet.updateTransactionBalance(TransactingComponent.SWAP);
  });
  expect(transaction().quote).toBeUndefined();
  expect(transaction().transactionStatus).toBe(TransactionStatus.MODIFIED);
  await settle();
  assertConsistent();
});
