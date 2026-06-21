import { axiosWithAuth } from "@/api/axios";
import { getUsersUrl } from "@/constants/api.constants";
import type { IUser } from "@/shared/types/user.interface";

export const userService = {
  async getProfile() {
    const response = await axiosWithAuth.get<IUser>(getUsersUrl("/profile"));
    return response.data;
  },
};
