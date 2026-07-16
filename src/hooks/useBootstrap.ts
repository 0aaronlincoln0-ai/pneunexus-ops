import { useQuery } from "@tanstack/react-query";
import { getBootstrap } from "../lib/api";

export function useBootstrap() {
  return useQuery({ queryKey: ["bootstrap"], queryFn: getBootstrap, staleTime: 30_000, retry: 1 });
}
