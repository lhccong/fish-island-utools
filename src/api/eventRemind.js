import { request } from "./request";

export const eventRemindApi = {
  /**
   * 分页获取当前用户的事件提醒列表
   * POST /api/event_remind/my/list/page
   */
  listMyByPage(params) {
    return request.post("/api/event_remind/my/list/page", params);
  },

  /**
   * 批量设置事件提醒为已读
   * POST /api/event_remind/batch/set/read
   */
  batchSetRead(ids) {
    return request.post("/api/event_remind/batch/set/read", { ids });
  },

  /**
   * 批量删除事件提醒（仅接收者可删除）
   * POST /api/event_remind/batch/delete
   */
  batchDelete(ids) {
    return request.post("/api/event_remind/batch/delete", { ids });
  },
};
