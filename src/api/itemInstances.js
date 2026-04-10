import { request } from "./request";

export const itemInstancesApi = {
  listMyItemInstances(params = {}) {
    return request.post("/api/itemInstances/my/list/page/vo", {
      current: 1,
      pageSize: 30,
      ...params,
    });
  },

  equipItem(itemInstanceId) {
    return request.post("/api/itemInstances/equip", {
      itemInstanceId,
    });
  },

  unequipItem(equipSlot) {
    return request.post("/api/itemInstances/unequip", {
      equipSlot,
    });
  },

  decomposeItem(itemInstanceId) {
    return request.post("/api/itemInstances/decompose", {
      itemInstanceId,
    });
  },
};

