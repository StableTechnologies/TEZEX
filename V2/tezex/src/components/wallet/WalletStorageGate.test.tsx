import React from "react";
import { act, render, screen } from "@testing-library/react";
import { WalletStorageGate } from "./WalletStorageGate";
import { prepareWalletStorage } from "../../functions/walletStorage";

jest.mock("../../functions/walletStorage");
const prepare = prepareWalletStorage as jest.MockedFunction<
  typeof prepareWalletStorage
>;

test("does not mount wallet providers until preparation completes", async () => {
  let finish!: () => void;
  prepare.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  const mounted = jest.fn();
  function Wallet() {
    mounted();
    return <div>Wallet ready</div>;
  }
  render(
    <WalletStorageGate>
      <Wallet />
    </WalletStorageGate>
  );
  expect(mounted).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => finish());
  expect(screen.getByText("Wallet ready")).toBeInTheDocument();
});

test("keeps wallet providers unmounted when preparation fails", async () => {
  prepare.mockRejectedValue(new Error("blocked"));
  render(
    <WalletStorageGate>
      <div>Wallet ready</div>
    </WalletStorageGate>
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Close other TEZEX tabs"
  );
  expect(screen.queryByText("Wallet ready")).not.toBeInTheDocument();
});
