import { request } from "./request";

/**
 * 买入指数
 * @param {Object} data - 买入参数
 * @param {string} data.indexCode - 指数代码
 * @param {number} data.amount - 买入金额
 * @returns {Promise}
 */
export const buyIndex = (data) => {
  return request.post("/api/index/trade/buy", data);
};

/**
 * 卖出指数
 * @param {Object} data - 卖出参数
 * @param {string} data.indexCode - 指数代码
 * @param {number} data.shares - 卖出份额
 * @returns {Promise}
 */
export const sellIndex = (data) => {
  return request.post("/api/index/trade/sell", data);
};

/**
 * 获取用户持仓信息
 * @returns {Promise}
 */
export const getPosition = () => {
  return request.get("/api/index/trade/position");
};

/**
 * 获取交易记录列表
 * @param {Object} params - 查询参数
 * @param {number} params.current - 当前页
 * @param {number} params.pageSize - 每页大小
 * @returns {Promise}
 */
export const getTransactions = (params) => {
  return request.post("/api/index/trade/transactions", params);
};

/**
 * 获取国内主要指数行情
 * @returns {Promise}
 */
export const getMajorIndices = () => {
  return request.get("/api/fund/indices");
};

export const stockApi = {
  buyIndex,
  sellIndex,
  getPosition,
  getTransactions,
  getMajorIndices,
};
