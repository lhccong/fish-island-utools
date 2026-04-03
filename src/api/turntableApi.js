import { request } from "./request";

export const turntableApi = {

  // 获取转盘列表
  listTurntables() {
    return request.get("/api/turntable/list");
  },

  // 获取转盘详情
  getTurntableDetail(id) {
    return request.get(`/api/turntable/detail/${id}`);
  },

  // 执行抽奖（单抽/十连抽通用）
  draw(turntableId, drawCount) {
    return request.post("/api/turntable/draw", {
      turntableId,
      drawCount
    });
  },

  // 获取抽奖记录
  listDrawRecords(params) {
    return request.get("/api/turntable/records", params);
  }

};