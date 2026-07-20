import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { getBootstrap } from "../lib/api";
import { emptyWorkspaceData } from "../lib/local-demo";

export function useBootstrap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bootstrap", user?.id ?? "public"],
    queryFn: user ? getBootstrap : async () => emptyWorkspaceData,
    staleTime: user ? 30_000 : Infinity,
    retry: user ? 1 : false,
  });
}
