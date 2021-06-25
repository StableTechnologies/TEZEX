import tzlogo from "../../assets/tzlogo.svg";
import ethlogo from "../../assets/ethlogo.svg";
import ethtzLogo from "../../assets/ethtzLogo.svg";
import usdcLogo from "../../assets/usdcLogo.svg";
import usdtzLogo from "../../assets/usdtzLogo.svg";
import metamaskLogo from "../../assets/metamaskLogo.svg";
import walletconnectLogo from "../../assets/walletconnectLogo.svg";

export const content = {
  connectWallet : "If you would like create a cross-chain swap, you will need to connect to both your Ethereum and Tezos wallets.",
  errorMessage: "Please confirm the connection request in your MetaMask wallet. If you don’t see a request pop-up, open the wallet extension. "

}
export const tokens = [
    {title: 'USDtz', logo: usdtzLogo, banner: 'USD Tez'},
    {title: 'USDC', logo: usdcLogo, banner: 'USD Coin'},
    {title: 'ETHtz', logo: ethtzLogo, banner: 'ETH Tez'},
    {title: 'ETH', logo: ethlogo, banner: 'Ether'},
    {title: 'XTZ', logo: tzlogo, banner: 'Tez'},
];
export const tokenWallets =  [
  { title: 'Metamask', logo: metamaskLogo, },
  { title: 'Wallet Connect', logo: walletconnectLogo, }
];