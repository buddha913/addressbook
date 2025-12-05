// CSV 분석용 순수 분석 함수 모듈
// - 등급/티어 요약, 개수 집계 등

import { assignGrades } from "./score.js";

// 전체 포스트 목록으로부터 등급/티어 요약 정보를 생성
export function buildTierSummaryFromPosts(allPosts) {
  var posts = (allPosts || []).slice();
  var summaryCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };

  if (!posts.length) {
    return {
      counts: summaryCounts,
      rows: []
    };
  }

  assignGrades(posts);

  for (var i = 0; i < posts.length; i++) {
    var g = posts[i].grade;
    if (summaryCounts[g] != null) summaryCounts[g] += 1;
  }

  return {
    counts: summaryCounts,
    rows: posts
  };
}

console.debug("[MUDDHA] analyze.js loaded (buildTierSummaryFromPosts).");
