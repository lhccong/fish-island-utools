/**
 * 宠物渲染工具
 * 用于判断是否为 webp 精灵图，以及提供默认动作配置
 */

/**
 * 宠物动作接口定义
 * @typedef {Object} PetAction
 * @property {string} [name] - 动作名称（可选，用于 tooltip）
 * @property {number} row - 精灵图中的行索引（0-based）
 * @property {number} frames - 该动作的帧数
 * @property {number} duration - 播放一轮的时长（ms）
 * @property {number} [weight] - 动作权重，用于随机选择，默认 1
 */

/**
 * 默认精灵图动作配置
 * 添加权重配置，Idle 和 Waiting 权重更高，更常出现
 */
export const DEFAULT_SPRITE_ACTIONS = [
  { name: 'Idle',      row: 0, frames: 6, duration: 1100, weight: 3 },
  { name: 'Run Right', row: 1, frames: 8, duration:  700, weight: 1 },
  { name: 'Run Left',  row: 2, frames: 8, duration:  700, weight: 1 },
  { name: 'Waving',    row: 3, frames: 4, duration:  800, weight: 2 },
  { name: 'Jumping',   row: 4, frames: 5, duration:  600, weight: 1 },
  { name: 'Failed',    row: 5, frames: 8, duration:  900, weight: 1 },
  { name: 'Waiting',   row: 6, frames: 6, duration: 1200, weight: 3 },
  { name: 'Running',   row: 7, frames: 6, duration:  600, weight: 1 },
  { name: 'Review',    row: 8, frames: 6, duration: 1000, weight: 2 },
];

/**
 * 判断是否为 webp 精灵图 URL
 * @param {string | null | undefined} url - 图片 URL
 * @returns {boolean}
 */
export const isWebpSprite = (url) => {
  return !!url && url.toLowerCase().endsWith('.webp');
};

/**
 * 获取宠物图片渲染配置
 * @param {string | null | undefined} url - 宠物图片 URL
 * @returns {{ isSprite: boolean, url: string | null }}
 */
export const getPetRenderConfig = (url) => {
  return {
    isSprite: isWebpSprite(url),
    url: url || null,
  };
};
