import { useContext } from 'react';
import { WalletContext } from '../contexts/wallet';

export function useWallet() {
    const wallet = useContext(WalletContext);

    return wallet;
}
