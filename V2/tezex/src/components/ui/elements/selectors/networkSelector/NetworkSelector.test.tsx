import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NetworkSelector } from "./NetworkSelector";

const mockSwitchNetwork = jest.fn();

jest.mock("../../../../../hooks/network", () => ({
  useNetwork: () => ({
    network: "custom",
    switchNetwork: mockSwitchNetwork,
  }),
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  mockSwitchNetwork.mockClear();
  jest.restoreAllMocks();
});

test("accepts Previewnet's empty cycle response without logging an error", async () => {
  const cycleJson = jest.fn();
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cycle: 0,
        level: 119147,
        timestamp: "2026-07-28T20:12:35Z",
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: cycleJson,
    }) as unknown as typeof fetch;
  const consoleError = jest.spyOn(console, "error").mockImplementation();

  render(
    <MemoryRouter>
      <NetworkSelector />
    </MemoryRouter>
  );

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(cycleJson).not.toHaveBeenCalled();
  expect(consoleError).not.toHaveBeenCalled();
});

test("keeps Snet labeled and opens its network details", () => {
  render(
    <MemoryRouter initialEntries={["/stez"]}>
      <NetworkSelector />
    </MemoryRouter>
  );

  const selector = screen.getByRole("button", {
    name: "Network: Snet, live",
  });

  expect(selector).toHaveTextContent("Snet");
  fireEvent.click(selector);

  expect(screen.getByText("Current network")).toBeInTheDocument();
  expect(screen.getByText("Public testnet")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Snet network details/i })
  ).toHaveAttribute("href", "https://teztnets.com/snet-about");
});

test("account presentation switches networks with the shared selector", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cycle: 0,
        level: 119147,
        timestamp: "2026-07-28T20:12:35Z",
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: jest.fn(),
    }) as unknown as typeof fetch;

  render(
    <MemoryRouter>
      <NetworkSelector presentation="account" />
    </MemoryRouter>
  );

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

  const selector = screen.getByRole("button", {
    name: "Network: Previewnet, live",
  });
  expect(selector).toHaveTextContent("Network");
  fireEvent.click(selector);
  fireEvent.click(screen.getByText("Mainnet"));

  expect(mockSwitchNetwork).toHaveBeenCalledWith("mainnet");
});
