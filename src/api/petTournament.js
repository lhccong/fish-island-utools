import { request } from "./request";

export const petTournamentApi = {
  getLeaderboard() {
    return request.get("/api/pet/tournament/leaderboard");
  },

  getMyRank() {
    return request.get("/api/pet/tournament/my/rank");
  },

  challenge(params = {}) {
    return request.post("/api/pet/tournament/challenge", {}, { params });
  },
};

