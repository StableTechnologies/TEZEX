import { FC } from "react";
import { useSession} from "../../hooks/session";

export interface IConnected {
  children:
    | JSX.Element
    | React.ReactElement
}

export const WalletConnected: FC<IConnected> = (props) => {
  const session= useSession();

  if (!session.isWalletConnected) {
    return null;
  }

  return <>{props.children}</>;
};
