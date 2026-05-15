import { request } from "./request";

export const redeemCodeApi = {
  useRedeemCode(code) {
    return request.post("/api/redeemCode/use", { code });
  },
};
