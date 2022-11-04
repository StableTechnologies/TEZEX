import { FC } from "react";
import { useSession} from "../../hooks/session";

export const WalletConnected: FC = (props) => {
  const session= useSession();

  if (!session.isWalletConnected) {
    return null;
  }

  return <>{props.children}</>;
};
