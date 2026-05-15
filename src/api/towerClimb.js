import { request } from "./request";

export const towerClimbApi = {
  challenge() {
    return request.post("/api/tower/challenge");
  },

  getFloorMonster(params = {}) {
    return request.get("/api/tower/floor", params);
  },

  getProgress() {
    return request.get("/api/tower/progress");
  },

  getRanking(params = {}) {
    return request.get("/api/tower/ranking", {
      limit: 100,
      ...params,
    });
  },
};

