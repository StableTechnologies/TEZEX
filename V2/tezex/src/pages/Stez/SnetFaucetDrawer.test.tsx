import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SnetFaucetDrawer } from "./SnetFaucetDrawer";

const address = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
const operationHash =
  "oo111111111111111111111111111111111111111111111111111111111111111111111111111111111";

beforeEach(() => {
  jest.restoreAllMocks();
});

test("submits the selected Snet amount and displays the full operation hash", async () => {
  const request = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ txHash: operationHash }),
  } as Response);

  render(
    <SnetFaucetDrawer
      open
      apiUrl="https://faucet-api.example"
      initialAddress={address}
      onClose={jest.fn()}
    />
  );

  fireEvent.change(screen.getByRole("slider", { name: "Faucet amount" }), {
    target: { value: "10000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "SEND 10,000 XTZ" }));

  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledWith(
    "https://faucet-api.example/api/claim",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        address,
        network: "snet",
        token: "xtz",
        amount: 10_000,
      }),
    })
  );
  expect(await screen.findByText(operationHash)).toBeInTheDocument();
});

test("rejects an invalid address before contacting the faucet", () => {
  const request = jest.spyOn(global, "fetch");

  render(
    <SnetFaucetDrawer
      open
      apiUrl="https://faucet-api.example"
      onClose={jest.fn()}
    />
  );

  fireEvent.change(screen.getByLabelText("DESTINATION ADDRESS"), {
    target: { value: "not-an-address" },
  });
  fireEvent.click(screen.getByRole("button", { name: "SEND 1,000 XTZ" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a valid Tezos wallet address."
  );
  expect(request).not.toHaveBeenCalled();
});
