import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface UserProfile {
  name: string;
}

export type UserProfilesResponse = UserProfile[];

export const useUserProfileQuery = () =>
  useQuery<UserProfilesResponse>({
    queryKey: ['user-profile'],
    queryFn: () => apiFetch<UserProfilesResponse>('/user-profile'),
    staleTime: 5 * 60 * 1000,
  });
