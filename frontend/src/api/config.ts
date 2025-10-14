import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type ConfigResponse = {
  options: string[];
  defaultOption: string;
  updatedAt: string;
  flags?: {
    questionGenerationEnabled?: boolean;
    feedbackEnabled?: boolean;
  };
};

export const useConfigQuery = () =>
  useQuery<ConfigResponse>({
    queryKey: ['config'],
    queryFn: () => apiFetch<ConfigResponse>('/config'),
    staleTime: 5 * 60 * 1000,
  });

