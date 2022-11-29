import { useContext } from 'react';
import { NetworkContext, NetworkInfo } from '../contexts/network';

export function useNetwork(): NetworkInfo {
    const network = useContext(NetworkContext);
    const netInfo: NetworkInfo = network.networks[network.selectedNetwork as string];
    return netInfo;
}
