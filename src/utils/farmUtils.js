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

/** 好友偷菜冷却剩余文案 */
export function formatStealCooldown(cooldown, now = Date.now()) {
  if (cooldown == null || cooldown === "") return "";
  if (typeof cooldown === "number" && Number.isFinite(cooldown)) {
    const ms = cooldown > 1e12 ? cooldown - now : cooldown;
    if (ms <= 0) return "";
    return formatCountdown(ms);
  }
  const end = new Date(cooldown).getTime();
  if (Number.isNaN(end)) return "";
  const ms = end - now;
  if (ms <= 0) return "";
  return formatCountdown(ms);
}

function truthyFlag(value) {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false" || value == null) {
    return false;
  }
  return Boolean(value);
}

/** 雪花 ID 等长整型：始终以字符串传递 */
export function toUserIdString(id) {
  if (id == null || id === "") return undefined;
  return typeof id === "string" ? id : String(id);
}

/** 好友列表项上的用户 ID（与 frontend getFriendUserId 一致） */
export function getFriendUserId(friend) {
  return toUserIdString(friend?.friendId ?? friend?.systemUserId);
}

/** 拜访好友农场时地块是否可交互 */
export function isFriendLandPlot(land) {
  if (!land) return false;
  return land.locked !== 1;
}

/** 偷菜接口所需地块 ID */
export function resolveStealLandId(land) {
  if (land?.id == null) return null;
  const id = Number(land.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** 好友农场：成熟、有地块 ID 且 canSteal===true */
export function canStealOnFriendLand(land, currentNow) {
  return (
    isFriendLandPlot(land) &&
    isLandMature(land, currentNow) &&
    resolveStealLandId(land) != null &&
    land.canSteal === true
  );
}

/** 汇总批量偷菜返回的积分 */
export function sumStealCoinGained(records) {
  return (records ?? []).reduce((sum, record) => sum + (record.coinGained ?? 0), 0);
}

export function unwrapFarmFriendList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.records)) return payload.records;
    if (Array.isArray(payload.list)) return payload.list;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

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
  if (!land) return false;
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

/** 拜访接口 friendUserId（字符串，避免雪花 ID 精度丢失） */
export function resolveFriendUserId(friend) {
  const id = getFriendUserId(friend);
  return id ?? null;
}

export const resolveFarmFriendId = resolveFriendUserId;

export function normalizeFarmFriend(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      nickname: "好友",
      level: 1,
      canSteal: false,
      stealCooldown: undefined,
    };
  }

  const friendId = raw.friendId ?? raw.friend_id;
  const systemUserId = raw.systemUserId ?? raw.system_user_id;

  const stealCooldown =
    raw.stealCooldown ??
    raw.stealCoolDown ??
    raw.steal_cooldown ??
    raw.cooldownEndTime ??
    raw.nextStealTime ??
    raw.stealCooldownEnd;

  return {
    friendId,
    systemUserId,
    nickname: String(
      raw.nickname ?? raw.userName ?? raw.nickName ?? raw.friendName ?? "好友",
    ),
    avatar: raw.avatar ?? raw.userAvatar ?? raw.friendAvatar,
    level: Number(raw.level ?? raw.farmLevel ?? raw.userLevel) || 1,
    canSteal: raw.canSteal === true,
    stealCooldown,
  };
}

function unwrapLandRaw(raw) {
  if (!raw || typeof raw !== "object") return raw;
  return raw.landDTO ?? raw.landDto ?? raw.land ?? raw;
}

function toPositiveId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function normalizeLand(raw) {
  const source = unwrapLandRaw(raw);
  if (!source || typeof source !== "object") return source;
  return {
    ...source,
    cropName: source.cropName ?? source.crop_name,
    harvestTime: source.harvestTime ?? source.harvest_time,
    plantedTime: source.plantedTime ?? source.planted_time,
    plantedCropId: source.plantedCropId ?? source.planted_crop_id,
    landIndex: source.landIndex ?? source.land_index,
  };
}

export function parseFriendLandsPayload(data) {
  if (Array.isArray(data)) return data.map((land) => normalizeLand(land));
  if (data && typeof data === "object" && Array.isArray(data.lands)) {
    return data.lands.map((land) => normalizeLand(land));
  }
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

/** 偷菜记录是否未读（0-未读、1-已读） */
export const isFarmStealRecordUnread = (record) => record?.isRead !== 1;
