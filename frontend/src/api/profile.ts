import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type UserResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    profiles: string[];
    activeProfile?: string;
    featureFlags?: Record<string, boolean>;
  };
};

export const useUserQuery = () =>
  useQuery<UserResponse>({
    queryKey: ['user'],
    queryFn: () => apiFetch<UserResponse>('/user'),
    staleTime: 5 * 60 * 1000,
  });

