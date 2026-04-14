import { request } from "./request";

/**
 * 获取当前用户备注
 * @returns {Promise<{code?: number, data?: {content?: string}, message?: string}>}
 */
export async function getRemarkUsingGet() {
  return request.get("/api/userRemark/get");
}

/**
 * 保存备注
 * @param {Object} body - 请求体
 * @param {string} body.content - 备注内容的JSON字符串
 * @returns {Promise<{code?: number, data?: boolean, message?: string}>}
 */
export async function saveRemarkUsingPost(body) {
  return request.post("/api/userRemark/save", body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * 用户备注API
 */
export const userRemarkApi = {
  /**
   * 获取当前用户备注
   * @returns {Promise<{code?: number, data?: {content?: string}, message?: string}>}
   */
  getRemark() {
    return getRemarkUsingGet();
  },

  /**
   * 保存备注
   * @param {string} content - 备注内容的JSON字符串
   * @returns {Promise<{code?: number, data?: boolean, message?: string}>}
   */
  saveRemark(content) {
    return saveRemarkUsingPost({ content });
  },
};
