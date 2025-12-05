// 점수/등급 계산 관련 순수 함수 모듈

// 트림 비율 (양 끝 10% 제거)
export const TRIM_RATIO = 0.1;

// 리스트를 점수 기준으로 정렬하고, 백분위/등급/티어 부여
export function assignGrades(list) {
  if (!list || !list.length) return;
  list.sort(function (a, b) {
    return b.score - a.score;
  });
  var N = list.length || 1;
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var pct = N > 1 ? 1 - i / (N - 1) : 1;
    p.percentile = Math.round(pct * 100);
    var g =
      pct >= 0.95 ? "S" :
      pct >= 0.80 ? "A" :
      pct >= 0.60 ? "B" :
      pct >= 0.40 ? "C" : "D";
    p.grade = g;
    p.tier = g; // 기존 티어 필드와 호환
  }
}

// 점수 리스트에 대해 양쪽 ratio 비율만큼 제거한 뒤 평균을 계산
export function computeTrimmedAverage(list, ratio) {
  if (!list || !list.length) return 0;
  var scores = list
    .map(function (p) {
      return p.score;
    })
    .sort(function (a, b) {
      return a - b;
    });
  var n = scores.length;
  var k = Math.floor(n * ratio);
  if (k * 2 >= n) k = 0;
  var trimmed = scores.slice(k, n - k);
  var sum = trimmed.reduce(function (s, v) {
    return s + v;
  }, 0);
  return trimmed.length ? sum / trimmed.length : 0;
}

console.debug("[MUDDHA] score.js loaded (TRIM_RATIO, assignGrades, computeTrimmedAverage).");
