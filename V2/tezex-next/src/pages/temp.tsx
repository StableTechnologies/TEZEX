import Link from 'next/link';
import {Wallet} from '../components/session/wallet';

export default function WalletStatus() {
  return (
    <>
      <h1>Connecting</h1>
      <Wallet> </Wallet>
      <h2>
        <Link href="/">Back to home</Link>
      </h2>
    </>
  );
}
