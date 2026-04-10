import { request } from "./request";

export const petApi = {
  async getPetRankList(params = {}) {
    const requestParams = {
      limit: 20,
      ...params,
    };

    try {
      const res = await request.get("/api/pet/rank/list", requestParams);
      if (res?.code === 0) {
        return res;
      }
      throw new Error(res?.message || "primary endpoint failed");
    } catch (error) {
      return request.get("/api/api/pet/rank/list", requestParams);
    }
  },

  getOtherUserPet(params = {}) {
    return request.get("/api/pet/other", params);
  },

  listItemTemplates(params = {}) {
    return request.post("/api/itemTemplates/list/page/vo", {
      current: 1,
      pageSize: 20,
      ...params,
    });
  },
};

