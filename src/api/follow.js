import { request } from "./request";

export const followApi = {
  isFollowing(followUserId) {
    return request.get("/api/follow/is-following", { followUserId });
  },

  toggleFollow(followUserId) {
    return request.get("/api/follow/toggle", { followUserId });
  },
};
