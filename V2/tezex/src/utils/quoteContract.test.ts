import { TezosToolkit } from "@taquito/taquito";
import { getQuoteContract } from "./quoteContract";

const harness = () => {
  const storage = jest.fn().mockResolvedValue({ reserves: 1 });
  const at = jest.fn().mockResolvedValue({ storage });
  const toolkit = { rpc: {}, contract: { at } } as unknown as TezosToolkit;
  return { toolkit, at, storage };
};
test("shares metadata across concurrent requests but keeps storage reads live", async () => {
  const { toolkit, at, storage } = harness();
  const [a, b] = await Promise.all([
    getQuoteContract(toolkit, "pool"),
    getQuoteContract(toolkit, "pool"),
  ]);
  expect(at).toHaveBeenCalledTimes(1);
  expect(a).toBe(b);
  await expect(a.storage()).resolves.toEqual({ reserves: 1 });
  storage.mockResolvedValue({ reserves: 2 });
  await expect(
    (await getQuoteContract(toolkit, "pool")).storage()
  ).resolves.toEqual({ reserves: 2 });
  expect(storage).toHaveBeenCalledTimes(2);
});
test("isolates addresses, toolkits and changed RPC providers", async () => {
  const a = harness(),
    b = harness();
  await getQuoteContract(a.toolkit, "pool");
  await getQuoteContract(a.toolkit, "another");
  await getQuoteContract(b.toolkit, "pool");
  Object.assign(a.toolkit, { rpc: {} });
  await getQuoteContract(a.toolkit, "pool");
  expect(a.at).toHaveBeenCalledTimes(3);
  expect(b.at).toHaveBeenCalledTimes(1);
});
test("failed metadata reads can be retried", async () => {
  const { toolkit, at } = harness();
  at.mockRejectedValueOnce(new Error("offline"));
  await expect(getQuoteContract(toolkit, "pool")).rejects.toThrow("offline");
  await expect(getQuoteContract(toolkit, "pool")).resolves.toBeDefined();
  expect(at).toHaveBeenCalledTimes(2);
});
