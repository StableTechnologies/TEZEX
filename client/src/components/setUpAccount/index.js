import { useContext, useState } from "react";
import { connectEthAccount } from "../../util";
import { TezexContext } from "../context/TezexContext";

export const useSetUpAccount = async (type, client, modal) => {
  const [isAccount, setIsAccount] = useState('');
  const globalContext = useContext(TezexContext);
  client = client();

  try {
    const r = await type();
    setIsAccount(r.account);
    globalContext.client(r);
  }
  catch(err) {
    return modal()
  }
}
export const useSetupEthAccount = async () => {
  const [ethAccount, setEthAccount] = useState('');
  const globalContext = useContext(TezexContext);
  // e.preventDefault();
  try {
      const r = await connectEthAccount();
      setEthAccount(r.account);
      globalContext.changeEthereumClient(r);
  }
  catch(err) {
    // return modal()
  }
};