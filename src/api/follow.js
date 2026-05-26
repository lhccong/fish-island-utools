import { request } from "./request";

export const followApi = {
  isFollowing(followUserId) {
    return request.get("/api/follow/is-following", { followUserId });
  },

  toggleFollow(followUserId) {
    return request.get("/api/follow/toggle", { followUserId });
  },

  listMyFollowing(params = {}) {
    return request.get("/api/follow/following", {
      current: 1,
      pageSize: 50,
      ...params,
    });
  },

  listMyFollowers(params = {}) {
    return request.get("/api/follow/followers", {
      current: 1,
      pageSize: 50,
      ...params,
    });
  },
};
