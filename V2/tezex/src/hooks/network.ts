import { useContext } from 'react';
import { NetworkContext } from '../contexts/network';

export function useNetwork() {
    const network = useContext(NetworkContext);

    return network;
}
