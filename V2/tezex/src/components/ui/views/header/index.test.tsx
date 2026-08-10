import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Header } from ".";

jest.mock("../../../wallet/Wallet", () => ({
  Wallet: () => <div>Wallet</div>,
}));

jest.mock("../../../../hooks/wallet", () => ({
  useWallet: () => ({ client: null, address: "" }),
}));

jest.mock("../../../../functions/beacon", () => ({
  connectWalletToCustomNetwork: jest.fn(),
}));

jest.mock("../../../../pages/Stez/network", () => ({
  resolveCurrentWeeklynet: jest.fn(),
}));

jest.mock("../../../nav", () => ({
  NavApp: () => <nav>Navigation</nav>,
}));

jest.mock("../../elements/selectors/networkSelector/NetworkSelector", () => ({
  NetworkSelector: () => <div>Network</div>,
}));

jest.mock("../../../../hooks/styles", () => () => ({
  isMobile: false,
  appBar: {},
  shell: {},
  toolbar: {},
  container: {},
  logoLink: {},
  logoLarge: {},
  networkSelector: {},
  nav: {},
  actions: {},
  themeToggle: {},
  themeIcon: {},
  themeToggleKnob: {},
  wallet: {},
  menu: {},
  menuButton: {},
  hide: {},
}));

jest.mock("../../../../contexts/color-mode", () => ({
  useColorMode: () => ({ mode: "light", toggleMode: jest.fn() }),
}));

const CurrentLocation = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

test("the TEZEX logo navigates to the swap home route", () => {
  render(
    <MemoryRouter
      initialEntries={["/liquidity"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Header openMenu={false} toggleMenu={jest.fn()} />
              <CurrentLocation />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("link", { name: "TEZEX home" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/");
});
