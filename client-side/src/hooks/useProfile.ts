import { useQuery } from "@tanstack/react-query";

import { getAccessToken } from "@/services/auth-token.service";
import { userService } from "@/services/user.service";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => userService.getProfile(),
    // Без токена профиль не запрашиваем — иначе на публичных страницах летят 401.
    enabled: Boolean(getAccessToken()),
    retry: false,
  });
}
