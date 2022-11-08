import { useContext } from 'react';
import { WalletContext } from '../contexts/wallet.tsx';

export default function useWallet() {
    const wallet = useContext(WalletContext);

    return wallet;
}
