import { createContext, ReactNode, useContext, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setShareToken } from "@workspace/api-client-react";

interface ShareAccessValue {
  token: string;
  sections: string[];
}

const ShareAccessContext = createContext<ShareAccessValue | null>(null);

export function ShareAccessProvider({
  token,
  sections,
  children,
}: ShareAccessValue & { children: ReactNode }) {
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    setShareToken(token);
    queryClient.clear();

    return () => {
      setShareToken(null);
      queryClient.clear();
    };
  }, [queryClient, token]);

  return (
    <ShareAccessContext.Provider value={{ token, sections }}>
      {children}
    </ShareAccessContext.Provider>
  );
}

export function useShareAccess(): ShareAccessValue | null {
  return useContext(ShareAccessContext);
}