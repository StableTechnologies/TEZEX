import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { Home } from ".";

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
        onClick={() => onNavigate("/home/swap")}
        disabled={isTransitioning}
      >
        Swap
      </button>
      <button
        type="button"
        onClick={() => onNavigate("/home/add")}
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
  const { mode = "swap" } = useParams();
  const path = mode === "remove" ? "remove" : mode === "add" ? "add" : "swap";
  return <Home path={path} />;
};

const Location = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderHome = () =>
  render(
    <MemoryRouter
      initialEntries={["/home/swap"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/home/:mode"
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

const originalStartViewTransition = document.startViewTransition;

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: originalStartViewTransition,
  });
  delete document.documentElement.dataset.modeTransition;
});

test("changes modes immediately when browser animation is unavailable", () => {
  renderHome();

  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/home/add");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
});

test("runs a full-workspace view transition when modes change", async () => {
  let finishTransition: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    finishTransition = resolve;
  });
  const startViewTransition = jest.fn((update: () => void) => {
    update();
    return { finished };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });

  renderHome();
  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(startViewTransition).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("location")).toHaveTextContent("/home/add");
  expect(document.documentElement.dataset.modeTransition).toBe("forward");
  expect(screen.getByRole("button", { name: "Swap" })).toBeDisabled();

  await act(async () => finishTransition());

  await waitFor(() =>
    expect(document.documentElement.dataset.modeTransition).toBeUndefined()
  );
  expect(screen.getByRole("button", { name: "Swap" })).toBeEnabled();
});
