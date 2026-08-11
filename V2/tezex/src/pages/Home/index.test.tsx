import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Home } from ".";
import { NetworkType } from "@airgap/beacon-sdk";
import { Token } from "../../types/general";
import { PoolType } from "../../types/pools";

const mockSwitchNetwork = jest.fn();
const mockSetSelectedPool = jest.fn();
const mockPool = {
  id: "xtz-tzbtc-sirius",
  name: "Sirius",
  type: PoolType.SIRIUS,
  address: "KT1-sirius",
  tokenA: Token.XTZ,
  tokenB: Token.TzBTC,
  lpToken: Token.Sirs,
};
let mockNetworkType = NetworkType.MAINNET;
let mockTradingAvailability:
  | {
      enabled: boolean;
      title: string;
      message: string;
      statusUrl?: string;
    }
  | undefined;

jest.mock("../../hooks/network", () => ({
  useNetwork: () => ({
    network: mockNetworkType,
    info: { tradingAvailability: mockTradingAvailability },
    switchNetwork: mockSwitchNetwork,
    selectedPool: mockPool,
    setSelectedPool: mockSetSelectedPool,
    getAllPools: () => [mockPool],
  }),
}));

jest.mock("../../components/nav", () => ({
  NavHome: ({
    onNavigate,
    isTransitioning,
  }: {
    onNavigate: (href: string) => void;
    isTransitioning: boolean;
  }) => (
    <nav>
      <button
        type="button"
        onClick={() => onNavigate("/")}
        disabled={isTransitioning}
      >
        Swap
      </button>
      <button
        type="button"
        onClick={() => onNavigate("/liquidity")}
        disabled={isTransitioning}
      >
        Liquidity
      </button>
    </nav>
  ),
}));

jest.mock("../../components/swap", () => ({
  Swap: () => <div>Swap workspace</div>,
}));

jest.mock("../../components/addLiquidity", () => ({
  AddLiquidity: () => <div>Liquidity workspace</div>,
}));

jest.mock("../../components/removeLiquidity", () => ({
  RemoveLiquidity: () => <div>Remove liquidity workspace</div>,
}));

jest.mock("../../hooks/styles", () => () => ({
  homeContainer: {},
  nav: { mobile: {} },
  contentViewport: {},
  modePanel: {},
}));

jest.mock("react-device-detect", () => ({
  BrowserView: ({ children }: { children: React.ReactNode }) => children,
  MobileView: () => null,
  useMobileOrientation: () => ({ orientation: "portrait" }),
}));

const RoutedHome = () => {
  const location = useLocation();
  const path =
    location.pathname === "/liquidity/remove"
      ? "remove"
      : location.pathname === "/liquidity"
      ? "add"
      : "swap";
  return <Home path={path} />;
};

const Location = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderHome = () =>
  render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="*"
          element={
            <>
              <RoutedHome />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const originalAnimate = HTMLElement.prototype.animate;
const originalRequestAnimationFrame = window.requestAnimationFrame;

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  mockTradingAvailability = undefined;
  mockNetworkType = NetworkType.MAINNET;
  mockSwitchNetwork.mockReset();
  mockSetSelectedPool.mockReset();
});

afterEach(() => {
  HTMLElement.prototype.animate = originalAnimate;
  window.requestAnimationFrame = originalRequestAnimationFrame;
  delete document.documentElement.dataset.modeTransition;
  document.documentElement.style.overflowX = "";
});

test("changes modes immediately when browser animation is unavailable", () => {
  renderHome();

  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/liquidity");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
});

test("shows both Shadownet funding routes on swap and liquidity", () => {
  mockNetworkType = NetworkType.SHADOWNET;
  renderHome();

  expect(screen.getByTestId("testnet-funding")).toHaveTextContent(
    "Fund your test wallet"
  );
  expect(screen.getByTestId("testnet-funding")).toHaveStyle({
    maxWidth: "470px",
  });
  const xtzFaucetLink = screen.getByRole("link", {
    name: "Get Shadownet test XTZ",
  });
  const tokenFaucetLink = screen.getByRole("link", {
    name: "Get StableTez Shadownet test tokens",
  });
  expect(xtzFaucetLink).toHaveAttribute(
    "href",
    "https://faucet.shadownet.teztnets.com"
  );
  expect(tokenFaucetLink).toHaveAttribute(
    "href",
    "https://faucet.stabletez.com"
  );
  expect(xtzFaucetLink.querySelector("svg")).toBeInTheDocument();
  expect(tokenFaucetLink.querySelector("svg")).toBeInTheDocument();
  expect(screen.getByTestId("testnet-funding")).not.toHaveTextContent("↗");

  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));
  expect(screen.getByTestId("testnet-funding")).toHaveStyle({
    maxWidth: "760px",
  });
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
  expect(
    screen
      .getByTestId("trading-workspace")
      .querySelector('[data-testid="testnet-funding"]')
  ).toBeTruthy();
});

test("shows a safe network notice instead of mounting trading on an unavailable network", () => {
  mockTradingAvailability = {
    enabled: false,
    title: "Previewnet contracts require redeployment",
    message: "The network reset cleared the previous contracts.",
    statusUrl: "https://previewnet.example.com",
  };

  renderHome();

  expect(screen.getByTestId("network-unavailable")).toHaveTextContent(
    "Previewnet contracts require redeployment"
  );
  expect(screen.queryByText("Swap workspace")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View Previewnet status" })
  ).toHaveAttribute("href", "https://previewnet.example.com");

  fireEvent.click(screen.getByRole("button", { name: "Return to Mainnet" }));
  expect(mockSwitchNetwork).toHaveBeenCalledWith(NetworkType.MAINNET);
});

test("moves outgoing and incoming workspaces on one continuous track", async () => {
  mockNetworkType = NetworkType.SHADOWNET;
  let finishTransition: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    finishTransition = resolve;
  });
  const snapshotPresentWhenCancelled: boolean[] = [];
  const incomingTransformsWhenCancelled: string[] = [];
  const cancel = jest.fn(() => {
    snapshotPresentWhenCancelled.push(
      Boolean(document.querySelector('[data-workspace-snapshot="true"]'))
    );
    incomingTransformsWhenCancelled.push(
      screen.getByTestId("trading-workspace").style.transform
    );
  });
  const animate = jest.fn(() => ({ finished, cancel } as unknown as Animation));
  HTMLElement.prototype.animate = animate;
  const animationFrames: FrameRequestCallback[] = [];
  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  });

  renderHome();
  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
  expect(
    document.querySelector('[data-workspace-snapshot="true"]')
  ).toHaveTextContent("Swap workspace");
  expect(
    document.querySelector('[data-workspace-snapshot="true"]')
  ).toHaveTextContent("Fund your test wallet");
  expect(screen.getByTestId("trading-workspace")).toHaveTextContent(
    "Fund your test wallet"
  );
  expect(document.documentElement.dataset.modeTransition).toBe("forward");
  expect(screen.getByRole("button", { name: "Swap" })).toBeDisabled();
  expect(animate).toHaveBeenNthCalledWith(
    1,
    [
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(-100%, 0, 0)" },
    ],
    {
      duration: 420,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      fill: "both",
    }
  );
  expect(animate).toHaveBeenNthCalledWith(
    2,
    [
      { transform: "translate3d(100%, 0, 0)" },
      { transform: "translate3d(0, 0, 0)" },
    ],
    {
      duration: 420,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      fill: "both",
    }
  );

  await act(async () => finishTransition());

  await waitFor(() =>
    expect(document.documentElement.dataset.modeTransition).toBeUndefined()
  );
  expect(screen.getByTestId("location")).toHaveTextContent("/liquidity");
  expect(
    document.querySelector('[data-workspace-snapshot="true"]')
  ).not.toBeInTheDocument();
  expect(snapshotPresentWhenCancelled).toEqual([false, false]);
  expect(incomingTransformsWhenCancelled).toEqual([
    "translate3d(0, 0, 0)",
    "translate3d(0, 0, 0)",
  ]);
  expect(screen.getByTestId("trading-workspace")).toHaveStyle({
    transform: "translate3d(0, 0, 0)",
  });
  expect(screen.getByRole("button", { name: "Swap" })).toBeDisabled();

  act(() => animationFrames.shift()?.(0));

  expect(screen.getByTestId("trading-workspace")).toHaveStyle({
    transform: "translate3d(0, 0, 0)",
  });

  act(() => animationFrames.shift()?.(16));

  expect(screen.getByTestId("trading-workspace")).not.toHaveStyle({
    transform: "translate3d(0, 0, 0)",
  });
  expect(screen.getByRole("button", { name: "Swap" })).toBeEnabled();
});
