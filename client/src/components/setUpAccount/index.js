import { useContext, useState } from "react";
import { connectEthAccount, connectTezAccount } from "../../util";
import { TezexContext } from "../context/TezexContext";

export const useSetupEthAccount = async () => {
// export function useSetupEthAccount() {
  const [ethAccount, setEthAccount] = useState('');
  const [errModalOpen, setErrModalOpen] = useState(false);
  const globalContext = useContext(TezexContext);
  // e.preventDefault();
  try {
    setErrModalOpen(false);
      const r = await connectEthAccount();
      // const r =  connectEthAccount();
      setEthAccount(r.account);
      globalContext.changeEthereumClient(r);
      setErrModalOpen(true);
  }
  catch(err) {
    // return modal()
  }
  return [ethAccount, errModalOpen];
};

export const useSetupXtzAccount = async () => {
  const [xtzAccount, setXtzAccount] = useState('');
  const globalContext = useContext(TezexContext);
  // e.preventDefault();
  try{
      const r = await connectTezAccount();
      setXtzAccount(r.account);
      globalContext.changeTezosClient(r);
  }
  catch(error) {}
};