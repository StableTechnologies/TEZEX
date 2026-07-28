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

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

test("changes modes immediately when browser animation is unavailable", () => {
  renderHome();

  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/home/add");
  expect(screen.getByText("Liquidity workspace")).toBeInTheDocument();
});

test("slides the current workspace out before the next workspace enters", async () => {
  let finishExit: () => void = () => undefined;
  const exitFinished = new Promise<void>((resolve) => {
    finishExit = resolve;
  });
  const animate = jest
    .fn()
    .mockReturnValueOnce({ finished: exitFinished, cancel: jest.fn() })
    .mockReturnValue({ finished: Promise.resolve(), cancel: jest.fn() });
  HTMLElement.prototype.animate = animate;

  renderHome();
  fireEvent.click(screen.getByRole("button", { name: "Liquidity" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/home/swap");
  expect(animate).toHaveBeenNthCalledWith(
    1,
    [
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
      { opacity: 0.35, transform: "translate3d(-18px, 0, 0)" },
    ],
    { duration: 140, easing: "cubic-bezier(.4,0,.7,.2)" }
  );

  await act(async () => finishExit());

  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/home/add")
  );
  expect(animate).toHaveBeenNthCalledWith(
    2,
    [
      { opacity: 0.35, transform: "translate3d(18px, 0, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ],
    { duration: 220, easing: "cubic-bezier(.22,.8,.24,1)" }
  );
});
