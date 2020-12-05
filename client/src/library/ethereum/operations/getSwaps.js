const getSwaps = async (store) => {
  const swaps = await store.contract.methods.getAllSwaps().call();
  console.log("Here : ", swaps);
  return swaps;
};

export default getSwaps;
