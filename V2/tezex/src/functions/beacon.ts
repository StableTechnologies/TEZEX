import { DAppClient } from '@airgap/beacon-sdk';
import { WalletInfo } from '../contexts/wallet';

export default async function connectWallet(walletInfo: WalletInfo) {
    const dAppClient = new DAppClient({ name: 'Tezex' });
	var err = false;
    try {
        const permissions = await dAppClient.requestPermissions();
        walletInfo.setAddress(permissions.address);
    } catch(error){ 
	    err = true
    }finally {
        err ? walletInfo.setClient(null) : walletInfo.setClient(dAppClient);
    }
}
