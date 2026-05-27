import { request } from "./request";

export const farmApi = {
  getMyFarmUser() {
    return request.get("/api/farm/user/info");
  },

  getMyLands() {
    return request.get("/api/land/my");
  },

  getAllCrops() {
    return request.get("/api/crop/all");
  },

  plant(items) {
    return request.post("/api/land/plant", { items });
  },

  harvest(landIds) {
    return request.post("/api/land/harvest", { landIds });
  },

  getMyStolenRecords() {
    return request.get("/api/steal/my-stolen");
  },

  /** 互关好友农场列表 GET /api/farm/friend/list */
  getFriendList() {
    return request.get("/api/farm/friend/list");
  },

  /** 好友地块列表 GET /api/farm/friend/lands */
  getFriendLands(friendUserId) {
    return request.get("/api/farm/friend/lands", {
      friendUserId: String(friendUserId),
    });
  },

  /** 偷菜（单块 landId 或批量 landIds）POST /api/steal */
  steal(body) {
    return request.post("/api/steal", body, {
      headers: { "Content-Type": "application/json" },
    });
  },

  async loadFriendLands(friendUserId) {
    const res = await this.getFriendLands(friendUserId);
    if (res?.code === 0 && res.data != null) {
      return res.data;
    }
    throw new Error(res?.msg || res?.message || "加载好友农场失败");
  },
};
