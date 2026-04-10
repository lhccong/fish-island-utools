import { request } from "./request";

/** 与 fish-island-frontend petSkinController 一致：/api/api/pet/skin/*；旧版 utools 曾用 /api/petSkin/* */
const PATHS = {
  list: ["/api/api/pet/skin/list", "/api/petSkin/list"],
  exchange: ["/api/api/pet/skin/exchange", "/api/petSkin/exchange"],
  set: ["/api/api/pet/skin/set", "/api/petSkin/set"],
};

async function getWithFallback(paths, params) {
  let lastErr;
  for (const path of paths) {
    try {
      return await request.get(path, params);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function postWithFallback(paths, data) {
  let lastErr;
  for (const path of paths) {
    try {
      return await request.post(path, data);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export const petSkinApi = {
  listPetSkins(params = {}) {
    const requestParams = {
      current: 1,
      pageSize: 100,
      ...params,
    };
    return getWithFallback(PATHS.list, requestParams);
  },

  exchangePetSkin(skinId) {
    return postWithFallback(PATHS.exchange, { skinId });
  },

  setPetSkin(skinId) {
    return postWithFallback(PATHS.set, { skinId });
  },
};
