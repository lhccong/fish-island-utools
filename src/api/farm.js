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

  /** 互关好友农场列表（含偷菜状态） */
  getFriendList() {
    return request.get("/api/farm/friend/list");
  },

  /** 获取好友农场地块 GET /api/farm/friend/lands?friendUserId= */
  getFriendLands(friendUserId) {
    return request.get("/api/farm/friend/lands", {
      friendUserId: String(friendUserId),
    });
  },

  /** 偷菜 */
  steal(plantRecordId) {
    return request.post("/api/steal", { plantRecordId });
  },
};
