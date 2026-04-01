import { request } from "./request";

export const voteApi = {
  // 获取活跃投票列表
  getActiveVotes() {
    return request.get("/api/vote/active/list");
  },
  /**
   * 创建投票
   * @param {object} params VoteCreateRequest
   * @param {string[]} params.options 投票选项列表
   * @param {boolean} params.singleChoice 是否单选（true 单选，false 多选）
   * @param {string} params.title 投票标题
   * @returns {Promise<{
   *   code: number,
   *   data: string,
   *   message: string
   * }>}
   */
  createVote(params) {
    return request.post("/api/vote/create", params);
  },
  /**
   * 删除投票
   * @param {object} params VoteDeleteRequest
   * @param {string} params.voteId 投票 ID
   * @returns {Promise<{
   *   code: number,
   *   data: boolean,
   *   message: string
   * }>}
   */
  deleteVote(params) {
    return request.post(`/api/vote/delete/${params.voteId}`, params);
  },
  /**
   * 参与投票
   * @param {object} params VoteRecordRequest
   * @param {number[]} params.optionIndexes 选项下标列表
   * @param {string} params.voteId 投票 ID
   * @returns {Promise<{
   *   code: number,
   *   data: boolean,
   *   message: string
   * }>}
   */
  recordVote(params) {
    return request.post("/api/vote/record", params);
  },
  /**
   * 获取投票结果
   * @param {string} voteId 投票 ID
   * @returns {Promise<{
   *   code: number,
   *   data: {
   *     hasVoted: boolean,
   *     options: Array<{
   *       count: number,
   *       index: number,
   *       percentage: number,
   *       text: string
   *     }>,
   *     remainingSeconds: number,
   *     singleChoice: boolean,
   *     title: string,
   *     totalCount: number,
   *     userVotedOptions: number[],
   *     voteId: string
   *   },
   *   message: string
   * }>}
   */
  getVoteResult(voteId) {
    return request.get(`/api/vote/result/${voteId}`);
  },
};