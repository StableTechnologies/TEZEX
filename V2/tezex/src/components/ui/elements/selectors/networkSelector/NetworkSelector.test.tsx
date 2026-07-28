import React from "react";
import { render, waitFor } from "@testing-library/react";
import { NetworkSelector } from "./NetworkSelector";

jest.mock("../../../../../hooks/network", () => ({
  useNetwork: () => ({
    network: "custom",
    switchNetwork: jest.fn(),
  }),
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
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

  render(<NetworkSelector />);

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(cycleJson).not.toHaveBeenCalled();
  expect(consoleError).not.toHaveBeenCalled();
});
