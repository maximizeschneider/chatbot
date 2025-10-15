import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface ConfigOption {
  name: string;
  publishedToMain: boolean;
  someShit: string;
}

export type ConfigResponse = ConfigOption[];

export const useConfigQuery = () =>
  useQuery<ConfigResponse>({
    queryKey: ["config"],
    queryFn: () => apiFetch<ConfigResponse>("/config"),
    staleTime: 5 * 60 * 1000,
  });
