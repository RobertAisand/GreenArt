import { axiosClassic } from "@/api/axios";
import { getAuthUrl } from "@/constants/api.constants";
import type { IAuthForm, IAuthResponse } from "@/shared/types/auth.interface";

import { removeFromStorage, saveTokenStorage } from "./auth-token.service";

export const authService = {
  async main(type: "login" | "register", data: IAuthForm) {
    const response = await axiosClassic.post<IAuthResponse>(
      getAuthUrl(`/${type}`),
      data,
    );

    if (response.data.accessToken) {
      saveTokenStorage(response.data.accessToken);
    }

    return response;
  },

  async getNewTokens() {
    const response = await axiosClassic.post<IAuthResponse>(
      getAuthUrl("/login/access-token"),
    );

    if (response.data.accessToken) {
      saveTokenStorage(response.data.accessToken);
    }

    return response;
  },

  async logout() {
    const response = await axiosClassic.post<boolean>(getAuthUrl("/logout"));

    if (response.data) {
      removeFromStorage();
    }

    return response;
  },
};
