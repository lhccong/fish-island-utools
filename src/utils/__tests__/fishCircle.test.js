import { describe, expect, it } from "vitest";
import {
  extractCommentImages,
  formatMomentTime,
  normalizeLotteryResult,
  renderLikeUsers,
  sortMomentsWithTopFirst,
  stripCommentImageMarkers,
} from "../fishCircle";

describe("fishCircle helpers", () => {
  it("formats timestamps into a readable exact shape", () => {
    expect(formatMomentTime("2026-05-15T08:30:00")).toBe("2026-05-15 08:30");
    expect(formatMomentTime("2026-05-15 08:30:00")).toBe("2026-05-15 08:30");
  });

  it("returns an empty string for missing or invalid timestamps", () => {
    expect(formatMomentTime("")).toBe("");
    expect(formatMomentTime("not-a-date")).toBe("");
  });

  it("normalizes lottery winners into a stable array", () => {
    const result = normalizeLotteryResult({
      winners: [{ userId: 1, userName: "alice", userAvatarUrl: "https://a/b.png" }],
      commentId: 99,
    });

    expect(result).toEqual({
      winners: [{ userId: 1, userName: "alice", userAvatar: "https://a/b.png" }],
      commentId: 99,
    });
  });

  it("normalizes missing lottery winners into an empty result", () => {
    expect(normalizeLotteryResult({ winners: null })).toEqual({
      winners: [],
      commentId: null,
    });
  });

  it("extracts and strips inline comment image markers", () => {
    const content = "hello[img:https://a/b.png][img:https://c/d.jpg]";

    expect(extractCommentImages(content)).toEqual([
      "https://a/b.png",
      "https://c/d.jpg",
    ]);
    expect(stripCommentImageMarkers(content)).toBe("hello");
  });

  it("joins like users into a readable display string", () => {
    expect(renderLikeUsers("alice,bob,, carol ")).toBe("alice、bob、carol");
  });

  it("keeps top moments ahead of regular moments", () => {
    const sorted = sortMomentsWithTopFirst([
      { id: 2, isTop: 0, createTime: "2026-05-15T10:00:00" },
      { id: 1, isTop: 1, createTime: "2026-05-15T09:00:00" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([1, 2]);
  });

  it("keeps top moments ahead after an isTop toggle", () => {
    const sorted = sortMomentsWithTopFirst([
      { id: 1, isTop: 0, createTime: "2026-05-15T09:00:00" },
      { id: 2, isTop: 1, createTime: "2026-05-15T08:00:00" },
      { id: 3, isTop: 0, createTime: "2026-05-15T10:00:00" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it("sorts equal top states by newest createTime without mutating input", () => {
    const source = [
      { id: 1, isTop: 0, createTime: "2026-05-15 09:00:00" },
      { id: 2, isTop: 0, createTime: "2026-05-15 10:00:00" },
      { id: 3, isTop: 0, createTime: "" },
    ];

    const sorted = sortMomentsWithTopFirst(source);

    expect(sorted.map((item) => item.id)).toEqual([2, 1, 3]);
    expect(source.map((item) => item.id)).toEqual([1, 2, 3]);
  });
});
