import ethlogo from "../../assets/ethlogo.svg";
import ethtzLogo from "../../assets/ethtzLogo.svg";
import metamaskLogo from "../../assets/metamaskLogo.svg";
import tzlogo from "../../assets/tzlogo.svg";
import usdcLogo from "../../assets/usdcLogo.svg";
import usdtzLogo from "../../assets/usdtzLogo.svg";
import walletconnectLogo from "../../assets/walletconnectLogo.svg";

export const content = {
  connectWallet: "If you would like create a cross-chain swap, you will need to connect to both your Ethereum and Tezos wallets.",
  errorMessage: "Please confirm the connection request in your MetaMask wallet. If you don’t see a request pop-up, open the wallet extension. "

}
// export const tokens = [
//     {title: 'USDtz', logo: usdtzLogo, banner: 'USD Tez'}
//     {title: 'USDC', logo: usdcLogo, banner: 'USD Coin'}
//     {title: 'ETHtz', logo: ethtzLogo, banner: 'ETH Tez'}
//     {title: 'ETH', logo: ethlogo, banner: 'Ether'}
//     {title: 'XTZ', logo: tzlogo, banner: 'Tez'}
// ];
export const tokens = [
  { title: 'USDtz', logo: usdtzLogo, banner: 'USD Tez', pairs: ['USDC', 'ETHtz', 'XTZ'] },
  { title: 'USDC', logo: usdcLogo, banner: 'USD Coin', pairs: ['USDtz'] },
  { title: 'ETHtz', logo: ethtzLogo, banner: 'ETH Tez', pairs: ['USDtz', 'ETH', 'XTZ'] },
  { title: 'ETH', logo: ethlogo, banner: 'Ether', pairs: ['ETHtz'] },
  { title: 'XTZ', logo: tzlogo, banner: 'Tez', pairs: ['USDtz', 'ETHtz'] },
  // { title: 'WBTC', logo: ethlogo, banner: 'WBTC', pairs: ['tzBTC'] },
  // { title: 'tzBTC', logo: tzlogo, banner: 'tzBTC', pairs: ['WBTC'] },
];
export const tokenWallets = [
  { title: 'Metamask', logo: metamaskLogo, },
  { title: 'Wallet Connect', logo: walletconnectLogo, }
];
