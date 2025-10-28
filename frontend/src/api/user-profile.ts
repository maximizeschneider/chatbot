import { useQuery } from "@tanstack/react-query";
import { fetchData } from "./client";

type ApiTestProfile = {
  _id: string;
  userId: string;
  description: string;
  data: Record<string, unknown>;
};

export interface UserProfile {
  _id: string;
  name: string;
  userId: string;
  description: string;
  data: Record<string, unknown>;
}

const mapProfile = (profile: ApiTestProfile): UserProfile => ({
  _id: profile._id,
  name: profile.description,
  userId: profile.userId,
  description: profile.description,
  data: profile.data,
});

export const useUserProfileQuery = (
  tenantId: string | null,
  userId: string | null,
) =>
  useQuery<UserProfile[]>({
    queryKey: ["test-profiles", tenantId, userId],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      if (!tenantId) {
        return [];
      }

      const params = new URLSearchParams();
      if (userId) {
        params.set("userId", userId);
      }
      params.set("skipSapApiResult", "true");

      const queryString = params.toString();

      const data = await fetchData<ApiTestProfile[]>(
        `/api/v1/tenant/${tenantId}/test-profiles${
          queryString ? `?${queryString}` : ""
        }`,
        {},
        "load test profiles",
      );

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(mapProfile);
    },
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });
