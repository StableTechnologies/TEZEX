import { useContext } from 'react';
import { SessionContext } from '../contexts/session.tsx';

export default function useSession() {
    const session = useContext(SessionContext);

    return session;
}
