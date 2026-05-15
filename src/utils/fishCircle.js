function toDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;

  if (typeof value !== "string") return null;

  const normalized = value.replace(/-/g, "/").replace("T", " ");
  const fallbackDate = new Date(normalized);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function toTimestamp(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

export function formatMomentTime(value) {
  if (!value) return "";

  const date = toDate(value);
  if (!date) return "";

  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function normalizeWinner(winner) {
  return {
    userId: winner?.userId ?? null,
    userName: winner?.userName || "",
    userAvatar: winner?.userAvatar || winner?.userAvatarUrl || "",
  };
}

export function normalizeLotteryResult(result) {
  return {
    winners: Array.isArray(result?.winners) ? result.winners.map(normalizeWinner) : [],
    commentId: result?.commentId ?? null,
  };
}

export function extractCommentImages(content) {
  return Array.from(String(content || "").matchAll(/\[img:([^\]]+)\]/g)).map(
    (item) => item[1]
  );
}

export function stripCommentImageMarkers(content) {
  return String(content || "")
    .replace(/\[img:[^\]]+\]/g, "")
    .trim();
}

export function renderLikeUsers(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("、");
}

export function sortMomentsWithTopFirst(items) {
  return [...(items || [])].sort((a, b) => {
    const topDiff = (b?.isTop || 0) - (a?.isTop || 0);
    if (topDiff !== 0) return topDiff;

    return toTimestamp(b?.createTime) - toTimestamp(a?.createTime);
  });
}
