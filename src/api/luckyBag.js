import { request } from "./request";

export const luckyBagApi = {
  getActive() {
    return request.get("/api/luckybag/active");
  },

  create(body) {
    return request.post("/api/luckybag/create", body, {
      headers: { "Content-Type": "application/json" },
    });
  },

  getDetail(luckyBagId) {
    return request.get("/api/luckybag/detail", { luckyBagId });
  },

  join(luckyBagId) {
    return request.post("/api/luckybag/join", null, {
      params: { luckyBagId },
    });
  },

  getRecords(luckyBagId) {
    return request.get("/api/luckybag/records", { luckyBagId });
  },
};
