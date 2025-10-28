import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./client";

export interface ConfigBlock {
  id: string;
  title: string;
}

export interface ConfigOption {
  name: string;
  templateId: string;
  publishedToMain: boolean;
  blocks: ConfigBlock[];
}

export const useConfigQuery = (tenantId: string | null) =>
  useQuery<ConfigOption[]>({
    queryKey: ["config", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) {
        return [];
      }

      const data = await fetchData<ConfigOption[]>(
        `/api/v1/tenant/${tenantId}/configuration`,
        {},
        "load configurations",
      );

      if (!Array.isArray(data)) {
        return [];
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });
