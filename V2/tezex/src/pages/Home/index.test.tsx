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

const originalAnimate = HTMLElement.prototype.animate;

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

afterEach(() => {
  HTMLElement.prototype.animate = originalAnimate;
  delete document.documentElement.dataset.modeTransition;
  document.documentElement.style.overflowX = "";
});

test("changes modes immediately when browser animation is unavailable", () => {
  renderHome();

  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/home/add");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
});

test("moves outgoing and incoming workspaces on one continuous track", async () => {
  let finishTransition: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    finishTransition = resolve;
  });
  const cancel = jest.fn();
  const animate = jest.fn(() => ({ finished, cancel } as unknown as Animation));
  HTMLElement.prototype.animate = animate;

  renderHome();
  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/home/swap");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
  expect(
    document.querySelector('[data-workspace-snapshot="true"]')
  ).toHaveTextContent("Swap workspace");
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
  expect(screen.getByTestId("location")).toHaveTextContent("/home/add");
  expect(
    document.querySelector('[data-workspace-snapshot="true"]')
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Swap" })).toBeEnabled();
});
