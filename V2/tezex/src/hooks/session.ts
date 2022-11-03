import { useContext } from "react";
import { SessionContext } from "../contexts/session";

export function useSession() {
  const session = useContext(SessionContext);

  return session;
}
