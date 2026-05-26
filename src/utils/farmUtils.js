export const GRID_COLS = 6;
export const GRID_ROWS = 4;
export const TOTAL_LANDS = GRID_COLS * GRID_ROWS;

export const FARM_HARVEST_ICON = "https://oss.cqbo.com/moyu/farm/toucai.png";

export const LAND_STATUS = {
  EMPTY: 0,
  GROWING: 1,
  MATURE: 2,
};

export const CATEGORY_LABEL = {
  grain: "粮食",
  vegetable: "蔬菜",
  fruit: "水果",
  flower: "花卉",
  specialty: "特产",
};

const buildSlotOrder = () => {
  const slots = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      slots.push({ row, col });
    }
  }
  return slots;
};

export const SLOT_ORDER = buildSlotOrder();

export const formatCountdown = (ms) => {
  if (ms <= 0) return "即将成熟";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
};

export const buildLandGrid = (lands) => {
  const grid = Array(TOTAL_LANDS).fill(null);
  const landByIndex = new Map();
  lands.forEach((land) => {
    const li = land.landIndex;
    if (li != null && li >= 1 && li <= TOTAL_LANDS) {
      landByIndex.set(li, land);
    }
  });
  SLOT_ORDER.forEach((_, arrayIndex) => {
    const land = landByIndex.get(arrayIndex + 1);
    if (land) grid[arrayIndex] = land;
  });
  return grid;
};

export const toLandIndex = (arrayIndex) => arrayIndex + 1;

export const mergeLandUpdates = (prev, updates) => {
  if (!updates?.length) return prev;
  const byId = new Map();
  const byIndex = new Map();
  updates.forEach((land) => {
    if (land.id != null) byId.set(land.id, land);
    if (land.landIndex != null) byIndex.set(land.landIndex, land);
  });
  let hit = false;
  const merged = prev.map((land) => {
    if (land.id != null && byId.has(land.id)) {
      hit = true;
      return byId.get(land.id);
    }
    if (land.landIndex != null && byIndex.has(land.landIndex)) {
      hit = true;
      return byIndex.get(land.landIndex);
    }
    return land;
  });
  return hit ? merged : [...prev, ...updates];
};

export const isLandUnlocked = (land) => {
  if (!land?.id) return false;
  return land.locked !== 1;
};

export const isLandEmpty = (land) => {
  if (!isLandUnlocked(land)) return false;
  const status = land.status;
  return status == null || status === LAND_STATUS.EMPTY;
};

export const isLandMature = (land, currentNow) => {
  if (land.status === LAND_STATUS.MATURE) return true;
  if (land.status !== LAND_STATUS.GROWING || !land.harvestTime) return false;
  return new Date(land.harvestTime).getTime() <= currentNow;
};

export const isCropIconUrl = (icon) => {
  if (!icon) return false;
  const v = icon.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("//") ||
    v.startsWith("/") ||
    v.startsWith("data:")
  );
};

/** 拜访接口 friendUserId：优先真实用户 ID，friendId 多为关系序号 */
export function resolveFriendUserId(friend) {
  const raw =
    friend?.friendUserId ??
    friend?.userId ??
    friend?.systemUserId ??
    friend?.id ??
    friend?.friendId;
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

export const resolveFarmFriendId = resolveFriendUserId;

export function normalizeFarmFriend(raw) {
  const friendUserId = resolveFriendUserId(raw);
  return {
    friendUserId: friendUserId ?? undefined,
    userId: friendUserId ?? undefined,
    systemUserId: friendUserId ?? undefined,
    nickname: String(raw.nickname ?? raw.userName ?? raw.nickName ?? "好友"),
    avatar: raw.avatar ?? raw.userAvatar,
    level: Number(raw.level) || 1,
    canSteal: Boolean(raw.canSteal),
    stealCooldown: raw.stealCooldown,
  };
}

export function parseFriendLandsPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.lands)) return data.lands;
  return [];
}

export const formatStolenTime = (time) => {
  if (!time) return "";
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
};
