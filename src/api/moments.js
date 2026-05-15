import { request } from "./request";

/** 分页查询朋友圈动态 POST /api/moments/list */
export function listMoments(data) {
  return request.post("/api/moments/list", data);
}

/** 点赞或取消点赞 POST /api/moments/like */
export function toggleMomentLike(data) {
  return request.post("/api/moments/like", data);
}

/** 发布动态 POST /api/moments/publish */
export function publishMoment(data) {
  return request.post("/api/moments/publish", data);
}

/** 修改动态 POST /api/moments/update */
export function updateMoment(data) {
  return request.post("/api/moments/update", data);
}

/** 删除动态 POST /api/moments/delete */
export function deleteMoment(data) {
  return request.post("/api/moments/delete", data);
}

/** Start moment lottery POST /api/moments/lottery/start */
export function startMomentLottery(data) {
  return request.post("/api/moments/lottery/start", data);
}

/** Top moment POST /api/moments/top */
export function topMoment(data) {
  return request.post("/api/moments/top", data);
}

/** 打赏 POST /api/moments/reward */
export function rewardMoment(data) {
  return request.post("/api/moments/reward", data);
}

/** 评论列表 POST /api/moments/comment/list */
export function listMomentComments(data) {
  return request.post("/api/moments/comment/list", data);
}

/** 发表评论 POST /api/moments/comment/add */
export function addMomentComment(data) {
  return request.post("/api/moments/comment/add", data);
}

/** 删除评论 POST /api/moments/comment/delete */
export function deleteMomentComment(data) {
  return request.post("/api/moments/comment/delete", data);
}

/** Top moment comment POST /api/moments/comment/top */
export function topMomentComment(data) {
  return request.post("/api/moments/comment/top", data);
}

/** Moment detail GET /api/moments/detail */
export function getMomentDetail(params) {
  return request.get("/api/moments/detail", params);
}
