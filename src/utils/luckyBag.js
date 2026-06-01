export const LUCKY_BAG_IMAGE = "https://oss.cqbo.com/moyu/fudai.jpg";
export const LUCKY_BAG_TAG_REGEX = /\[luckybag\]([^\[\]]*)\[\/luckybag\]/i;

export function isLuckyBagMessage(content) {
  if (!content || typeof content !== "string") return false;
  return LUCKY_BAG_TAG_REGEX.test(content);
}

export function parseLuckyBagInline(content) {
  if (!content) return null;
  const match = LUCKY_BAG_TAG_REGEX.exec(content);
  if (!match) return null;
  const prefix = content.replace(match[0], "").trim();
  return { prefix, luckyBagId: match[1] };
}

export function getLuckyBagStatusText(detail) {
  if (!detail) return "加载中...";
  if (detail.status === 2) return "已过期";
  if (detail.status === 3) return "已开奖";
  return "进行中";
}

export function isLuckyBagJoinDisabled(detail) {
  if (!detail) return true;
  if (detail.status === 2 || detail.status === 3) return true;
  if (detail.joined) return true;
  return false;
}

export function formatLuckyBagDateTime(time) {
  if (!time) return "-";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleString();
}

export function getLuckyBagDrawTime(detail) {
  return formatLuckyBagDateTime(detail?.drawTime || detail?.expireTime);
}

export function getLuckyBagTypeLabel(type) {
  return type === 2 ? "平均分配" : "随机分配";
}
