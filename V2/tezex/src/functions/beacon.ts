import { DAppClient } from '@airgap/beacon-sdk';
import { WalletInfo } from '../contexts/wallet';

export default async function connectWallet(walletInfo: WalletInfo) {
    const dAppClient = new DAppClient({ name: 'Beacon Docs' });

    try {
        const permissions = await dAppClient.requestPermissions();
        walletInfo.setAddress(permissions.address);
    } catch(err){ 
        walletInfo.setClient(null);
    }finally {
        walletInfo.setClient(dAppClient);
    }
}
