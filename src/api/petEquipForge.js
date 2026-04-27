import { request } from "./request";

export const petEquipForgeApi = {
  getForgeDetail(data) {
    return request.post("/api/pet/forge/detail", data);
  },

  upgradeEquip(data) {
    return request.post("/api/pet/forge/upgrade", data);
  },

  refreshEntries(data) {
    return request.post("/api/pet/forge/refresh", data);
  },

  lockEntries(data) {
    return request.post("/api/pet/forge/lock", data);
  },
};

