import { request } from "./request";

/**
 * 获取 BOSS 列表（带缓存）
 * @param {Object} [options] - 请求配置选项
 * @returns {Promise<{
 *   code?: number;
 *   data?: Array<{
 *     attack?: number;
 *     avatar?: string;
 *     health?: number;
 *     id?: number;
 *     name?: string;
 *     rewardPoints?: number;
 *   }>;
 *   message?: string;
 * }>}
 */
export async function getBossListWithCacheUsingGet(options) {
  return request.get("/api/boss/list/cache", options || {});
}

/**
 * 获取Boss对战信息（包含当前用户的宠物信息和Boss信息）
 * @param {Object} params - 请求参数
 * @param {number} params.bossId - bossId
 * @param {Object} [options] - 请求配置选项
 * @returns {Promise<{
 *   code?: number;
 *   data?: {
 *     bossInfo?: {
 *       attack?: number;
 *       avatar?: string;
 *       currentHealth?: number;
 *       id?: number;
 *       maxHealth?: number;
 *       name?: string;
 *       rewardPoints?: number;
 *     };
 *     petInfo?: {
 *       attack?: number;
 *       avatar?: string;
 *       health?: number;
 *       level?: number;
 *       name?: string;
 *       petId?: number;
 *     };
 *   };
 *   message?: string;
 * }>}
 */
export async function getBossBattleInfoUsingGet(params, options) {
  // request.get 只接受 path 和 params 两个参数
  // 如果需要传递额外配置，合并到 params 中或直接使用 request.instance.get
  return request.get("/api/boss/battle/info", params || {});
}

/**
 * 对战Boss（10个回合，每天只能挑战一次）
 * @param {Object} params - 请求参数
 * @param {number} params.bossId - bossId
 * @param {Object} [options] - 请求配置选项
 * @returns {Promise<{
 *   code?: number;
 *   data?: Array<{
 *     attackerType?: string; // 当前攻击对象类型：PET-宠物攻击，BOSS-Boss攻击
 *     bossRemainingHealth?: number; // Boss剩余血量
 *     damage?: number; // 扣血量
 *     isCombo?: boolean; // 是否连击
 *     isCritical?: boolean; // 是否暴击
 *     isDodge?: boolean; // 是否闪避
 *     isNormalAttack?: boolean; // 是否普通攻击
 *     petRemainingHealth?: number; // 宠物剩余血量
 *   }>;
 *   message?: string;
 * }>}
 */
export async function battleUsingGet(params, options) {
  return request.get("/api/boss/battle", params || {});
}

/**
 * 获取Boss挑战排行榜
 * @param {Object} params - 请求参数
 * @param {number} params.bossId - bossId
 * @param {number} [params.limit] - limit，默认值为10
 * @param {Object} [options] - 请求配置选项
 * @returns {Promise<{
 *   code?: number;
 *   data?: Array<{
 *     damage?: number;
 *     petAvatar?: string;
 *     petName?: string;
 *     rank?: number;
 *     userAvatar?: string;
 *     userId?: number;
 *     userName?: string;
 *   }>;
 *   message?: string;
 * }>}
 */
export async function getBossChallengeRankingUsingGet(params, options) {
  const requestParams = {
    limit: 10,
    ...params,
  };
  return request.get("/api/boss/ranking", requestParams);
}

export const bossApi = {
  getBossListWithCache: getBossListWithCacheUsingGet,
  getBossBattleInfo: getBossBattleInfoUsingGet,
  battle: battleUsingGet,
  getBossChallengeRanking: getBossChallengeRankingUsingGet,
};

