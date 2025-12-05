import { fetchKaitoLeaderboard, renderKaitoDashboardSlider } from "./logic/kaito.js";
import "./logic/cookie.js";
import { setAccumRows, loadAccumRowsFromStorage, getAccumRows } from "./logic/csvStore.js";
import "./logic/csv/csvCore.js";
import { parseCsvFile } from "./logic/csv/parser.js";
import { TRIM_RATIO, assignGrades, computeTrimmedAverage } from "./logic/csv/score.js";
import { buildTierSummaryFromPosts } from "./logic/csv/analyze.js";
import { buildProjectPostsFromCsv, aggregateByProject } from "./logic/mindshare/core.js";

// === 점수/등급 계산: 옛날 분석기와 동일한 로직 ===
          window.csvAllPosts = [];

// 전체 포스트 기준으로 등급/티어를 다시 계산해서 티어 테이블에 반영
          function recomputeTierFromPosts() {
            var result = buildTierSummaryFromPosts(window.csvAllPosts || []);
            window.csvTierSummary = result;

            if (typeof renderTierExplosionTop === "function") renderTierExplosionTop();
            if (typeof renderTierFilterList === "function") renderTierFilterList("ALL");
          }


          // CSV 분석: 업로드 + 기본 통계 + 저장 + 상단 탭 전환 (간소화 버전)
              document.addEventListener("DOMContentLoaded", function () {
                // ---- CSV 상단 서브탭 전환 ----

                const monthFilterSelect = document.getElementById("csvMonthFilter");
                if (monthFilterSelect) {
                  monthFilterSelect.addEventListener("change", function () {
                    var v = monthFilterSelect.value || "ALL";
                    rebuildCsvViewForMonth(v);
                  });
                }

                const csvPanels = document.querySelectorAll(".csv-main-panel");
                const csvButtons = document.querySelectorAll(".csv-main-btn");

                const tierFilterButtons = document.querySelectorAll(".tier-filter-btn");
                function setupTierFilterButtons() {
                  if (!tierFilterButtons || !tierFilterButtons.length) return;
                  tierFilterButtons.forEach(function (btn) {
                    btn.addEventListener("click", function () {
                      tierFilterButtons.forEach(function (b) { b.classList.remove("active"); });
                      btn.classList.add("active");
                      var t = btn.getAttribute("data-tier-filter") || "ALL";
                      if (typeof renderTierFilterList === "function") {
                        renderTierFilterList(t);
                      }
                    });
                  });
                }
                setupTierFilterButtons();



                function showCsvPanel(name) {
                  csvPanels.forEach(function (panel) {
                    if (panel.id === "csv-main-" + name) {
                      panel.classList.add("active");
                    } else {
                      panel.classList.remove("active");
                    }
                  });
                  csvButtons.forEach(function (btn) {
                    if (btn.dataset.csvMain === name) {
                      btn.classList.add("active");
                    } else {
                      btn.classList.remove("active");
                    }
                  });
                }

                csvButtons.forEach(function (btn) {
                  btn.addEventListener("click", function () {
                    var name = btn.dataset.csvMain;
                    if (name) showCsvPanel(name);
                  });
                });

                // 기본은 업로드 패널
                showCsvPanel("upload");

                // ---- CSV 업로드 & 그래프 ----
                var fileInput = document.getElementById("csvFileInput");
                var analyzeBtn = document.getElementById("csvAnalyzeButton");
                var summaryBox = document.getElementById("csvSummaryBox");
                var lastSaveSummary = document.getElementById("csvLastSaveSummary");
                var modeSelect = document.getElementById("csvModeSelect");
                if (modeSelect) {
                  // 이전에 선택한 분석 모드 복원 (기본값: MY)
                  try {
                    if (window.localStorage) {
                      var savedMode = localStorage.getItem("muddha_csv_mode");
                      if (savedMode === "TEMP" || savedMode === "MY") {
                        csvMode = savedMode;
                        modeSelect.value = savedMode;
                      }
                    }
                  } catch (e) {
                    console.warn("csv mode restore error", e);
                  }

                  modeSelect.addEventListener("change", function () {
                    csvMode = modeSelect.value || "MY";
                    try {
                      if (window.localStorage) {
                        localStorage.setItem("muddha_csv_mode", csvMode);
                      }
                    } catch (e2) {
                      console.warn("csv mode save error", e2);
                    }
                    if (typeof updateCsvLastSaveSummary === "function") {
                      updateCsvLastSaveSummary();
                    }
                  });
                }

                var scoreInfo = document.getElementById("csvScoreInfo");
                var chartCanvas = document.getElementById("csvScoreChart");
                var csvScoreChartInstance = null;

                function toNumber(v) {
                  if (v === null || v === undefined) return 0;
                  if (typeof v === "number") return v;
                  var cleaned = String(v).replace(/,/g, "").trim();
                  var n = parseFloat(cleaned);
                  return isNaN(n) ? 0 : n;
                }

                function findColumn(columns, candidates) {
                  if (!columns || !columns.length) return null;
                  var lower = columns.map(function (c) { return String(c).toLowerCase(); });

                  // 1) 완전 일치 우선
                  for (var i = 0; i < candidates.length; i++) {
                    var target = String(candidates[i]).toLowerCase();
                    for (var j = 0; j < lower.length; j++) {
                      if (lower[j] === target) return columns[j];
                    }
                  }
                  // 2) 부분 일치 허용 (예: "tweet text", "트윗 내용")
                  for (var i2 = 0; i2 < candidates.length; i2++) {
                    var target2 = String(candidates[i2]).toLowerCase();
                    for (var k = 0; k < lower.length; k++) {
                      if (lower[k].indexOf(target2) !== -1) return columns[k];
                    }
                  }
                  return null;
                }

                // CSV 날짜 파싱 (행 + 날짜 컬럼명을 받아서 YYYY-MM-DD 문자열로 변환)
                function parseDateStr(row, dateKey) {
                  if (!row || !dateKey) return null;
                  var raw = row[dateKey];
                  if (!raw) return null;
                  var s = String(raw).trim();
                  if (!s) return null;

                  // 1) YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD 형태 우선 처리
                  var m = s.match(/(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})/);
                  var d = null;
                  if (m) {
                    var y = parseInt(m[1], 10);
                    var mo = parseInt(m[2], 10);
                    var da = parseInt(m[3], 10);
                    if (y && mo && da) {
                      d = new Date(y, mo - 1, da);
                    }
                  }

                  // 2) 위에서 못 잡았으면 Date.parse로 한 번 더 시도
                  if (!d || isNaN(d.getTime())) {
                    var parsed = Date.parse(s);
                    if (!isNaN(parsed)) {
                      d = new Date(parsed);
                    }
                  }

                  if (!d || isNaN(d.getTime())) return null;

                  var yy = d.getFullYear();
                  var mm = d.getMonth() + 1;
                  var dd = d.getDate();
                  var mmStr = (mm < 10 ? "0" + mm : String(mm));
                  var ddStr = (dd < 10 ? "0" + dd : String(dd));
                  return yy + "-" + mmStr + "-" + ddStr;
                }





                // ---- 월별 필터용 헬퍼 함수 ----
                function populateMonthFilterFromRows(rows) {
                  var select = document.getElementById("csvMonthFilter");
                  if (!select || !rows || !rows.length) return;

                  // 기본 옵션(전체)만 남기고 초기화
                  select.innerHTML = '<option value="ALL">전체</option>';

                  var columns = Object.keys(rows[0] || {});
                  var dateKey = findColumn(columns, ["time", "date", "날짜", "작성일"]);
                  if (!dateKey) return;

                  var monthSet = {};
                  rows.forEach(function (row) {
                    var d = parseDateStr(row, dateKey);
                    if (!d) return;
                    var monthKey = d.slice(0, 7); // "YYYY-MM"
                    monthSet[monthKey] = true;
                  });

                  var months = Object.keys(monthSet).sort(); // 오래된 달부터
                  months.forEach(function (m) {
                    var label = m;
                    // 보기 좋게 "YYYY-MM" -> "YYYY년 MM월"로 변환
                    var parts = m.split("-");
                    if (parts.length === 2) {
                      var yy = parts[0];
                      var mm = parts[1].replace(/^0/, "");
                      label = yy + "년 " + mm + "월";
                    }
                    var opt = document.createElement("option");
                    opt.value = m;
                    opt.textContent = label;
                    select.appendChild(opt);
                  });
                }

                function rebuildCsvViewForMonth(monthKey) {
                  monthKey = monthKey || "ALL";
                  window.csvMonthFilterValue = monthKey;

                  if (!window.csvAccumRows || !window.csvAccumRows.length) return;

                  var baseRows = window.csvAccumRows;
                  if (monthKey === "ALL") {
                    buildChartFromRows(baseRows);
                    return;
                  }

                  var columns = Object.keys(baseRows[0] || {});
                  var dateKey = findColumn(columns, ["time", "date", "날짜", "작성일"]);
                  if (!dateKey) {
                    buildChartFromRows(baseRows);
                    return;
                  }

                  var filtered = baseRows.filter(function (row) {
                    var d = parseDateStr(row, dateKey);
                    if (!d) return false;
                    return d.slice(0, 7) === monthKey;
                  });

                  buildChartFromRows(filtered);
                }


                // CSV 활동 패턴 / 티어 / 코치봇 업데이트

                // CSV 활동 패턴 / 티어 / 코치봇 업데이트 (ES5 호환 버전)

          
          function updateDashboardMindshareCardFromCsv(stats) {
            stats = stats || {};
            var trimmed = (typeof stats.trimmedScore === "number" && !isNaN(stats.trimmedScore)) ? stats.trimmedScore : null;
            var avg = (typeof stats.accountAverageScore === "number" && !isNaN(stats.accountAverageScore)) ? stats.accountAverageScore : null;

            function fmtScore(v) {
              if (typeof v !== "number" || isNaN(v)) return "-";
              return String(Math.round(v * 10) / 10);
            }

            var mainEl = document.getElementById("dashboardTrimmedScore");
            var miniEl = document.getElementById("dashboardTrimmedScoreMini");
            var avgEl = document.getElementById("dashboardAccountAvg");
            var chipEl = document.getElementById("dashboardChipText");
            var rangeEl = document.getElementById("dashboardScoreRange");

            if (mainEl && trimmed !== null) {
              mainEl.textContent = fmtScore(trimmed);
            }
            if (miniEl && trimmed !== null) {
              miniEl.textContent = fmtScore(trimmed) + "점";
            }
            if (avgEl && avg !== null) {
              avgEl.textContent = fmtScore(avg) + "점";
            }

            if (chipEl && trimmed !== null && avg !== null) {
              var diff = trimmed - avg;
              var sign = diff >= 0 ? "+" : "";
              var diffRounded = Math.round(diff * 10) / 10;
              chipEl.textContent = sign + diffRounded + " · 최근 7일 vs 계정 평균";
            }

            if (rangeEl && trimmed !== null) {
              var low = Math.max(0, Math.round(trimmed - 5));
              var high = Math.round(trimmed + 5);
              rangeEl.textContent = "예상 YAP 밴드 · " + low + " – " + high + " 구간 (임시 추정)";
            }
          }

function updateCsvPatternAndTier(info) {
                  // 최대한 단순하게: 날짜 배열(rawDates) + 일자별 Trimmed 점수(trimmedDailyScores)만 사용
                  info = info || {};
                  var rawDates = info.rawDates || [];
                  var dates    = info.dates || [];
                  var trimmed  = info.trimmedDailyScores || [];
                  var byDate   = info.byDate || {};

                  // 아무 데이터도 없으면 그냥 리턴
                  if (!rawDates || !rawDates.length || !trimmed || !trimmed.length) {
                    return;
                  }

                  // ---- 요일 패턴 계산 ----
                  var dowNames = ["일", "월", "화", "수", "목", "금", "토"];
                  var dowCount = [0,0,0,0,0,0,0];
                  var dowScore = [0,0,0,0,0,0,0];

                  for (var i = 0; i < rawDates.length; i++) {
                    var dKey = rawDates[i];          // "YYYY-MM-DD"
                    var scoreVal = trimmed[i];
                    if (typeof scoreVal !== "number" || isNaN(scoreVal)) continue;

                    var parts = (dKey || "").split("-");
                    if (parts.length < 3) continue;
                    var y = parseInt(parts[0], 10);
                    var m = parseInt(parts[1], 10) - 1;
                    var d = parseInt(parts[2], 10);
                    if (!y || isNaN(m) || !d) continue;

                    var dt = new Date(y, m, d);
                    if (!dt || isNaN(dt.getTime())) continue;
                    var dow = dt.getDay(); // 0~6

                    dowCount[dow] += 1;
                    dowScore[dow] += scoreVal;
                  }

                  // 요일별 평균
                  var dowAvg = [];
                  for (var di = 0; di < dowScore.length; di++) {
                    if (dowCount[di] > 0) {
                      dowAvg.push(dowScore[di] / dowCount[di]);
                    } else {
                      dowAvg.push(0);
                    }
                  }

                  // ---- 시간대 패턴은 일단 전체 Trimmed 평균을 그대로 사용 (시간 정보가 없으므로) ----
                  var hourAvg = [];
                  var sumTrim = 0, cntTrim = 0;
                  for (var ti = 0; ti < trimmed.length; ti++) {
                    var tv = trimmed[ti];
                    if (typeof tv === "number" && !isNaN(tv)) {
                      sumTrim += tv;
                      cntTrim += 1;
                    }
                  }
                  var globalAvg = cntTrim ? (sumTrim / cntTrim) : 0;
                  for (var h = 0; h < 24; h++) {
                    hourAvg.push(globalAvg);
                  }

                  // ---- 차트 렌더링 ----
                  if (window.csvPatternDowChart) {
                    window.csvPatternDowChart.destroy();
                  }
                  if (window.csvPatternHourChart) {
                    window.csvPatternHourChart.destroy();
                  }

                  var elDow = document.getElementById("csvPatternDowChart");
                  if (elDow && window.Chart) {
                    var ctxDow = elDow.getContext("2d");
                    window.csvPatternDowChart = new Chart(ctxDow, {
                      type: "bar",
                      data: {
                        labels: ["일요일","월요일","화요일","수요일","목요일","금요일","토요일"],
                        datasets: [{
                          label: "요일별 평균 Trimmed Score",
                          data: dowAvg,
                          borderWidth: 1
                        }]
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false
                      }
                    });
                  }

                  var elHour = document.getElementById("csvPatternHourChart");
                  if (elHour && window.Chart) {
                    var labelsHour = [];
                    for (var lh = 0; lh < 24; lh++) labelsHour.push(lh + "시");
                    var ctxHour = elHour.getContext("2d");
                    window.csvPatternHourChart = new Chart(ctxHour, {
                      type: "line",
                      data: {
                        labels: labelsHour,
                        datasets: [{
                          label: "시간대별 평균 Trimmed Score",
                          data: hourAvg,
                          borderWidth: 2
                        }]
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false
                      }
                    });
                  }

                  // ---- 요약 텍스트 및 최적 요일/시간대 ----
                  function pickTop(arr) {
                    var bestIdx = 0;
                    var bestVal = -Infinity;
                    for (var pi = 0; pi < arr.length; pi++) {
                      if (arr[pi] > bestVal) {
                        bestVal = arr[pi];
                        bestIdx = pi;
                      }
                    }
                    return { idx: bestIdx, value: bestVal };
                  }

                  var topDowPost = pickTop(dowCount);
                  var topDowScore = pickTop(dowAvg);
                  var labelTopPostDow = dowNames[topDowPost.idx] + "요일";
                  var labelTopScoreDow = dowNames[topDowScore.idx] + "요일";
                  var labelTopPostHour = "전체 시간대"; // 시간 정보가 없어서 간단 처리
                  var labelTopScoreHour = "전체 시간대";

                  var el1 = document.getElementById("patternTopPostDow");
                  var el2 = document.getElementById("patternTopScoreDow");
                  var el3 = document.getElementById("patternTopPostHour");
                  var el4 = document.getElementById("patternTopScoreHour");
                  var elSummary = document.getElementById("patternSummaryText");

                  if (el1) el1.textContent = labelTopPostDow;
                  if (el2) el2.textContent = labelTopScoreDow;
                  if (el3) el3.textContent = labelTopPostHour;
                  if (el4) el4.textContent = labelTopScoreHour;
                  if (elSummary) {
                    elSummary.textContent =
                      labelTopScoreDow + "에 올린 글의 반응이 상대적으로 좋게 나타납니다. 시간대는 아직 세부 데이터가 없어서 전체 평균 기준으로만 보여줍니다.";
                  }


                  // ---- 티어 계산 ----
                  // Trimmed Score 분포 기준으로 S/A/B/C 경계를 잡는다 (상위 5%/20%/40%)
                  var validTrim = [];
                  for (var ti = 0; ti < trimmed.length; ti++) {
                    var tv = trimmed[ti];
                    if (typeof tv === "number" && !isNaN(tv)) validTrim.push(tv);
                  }
                  validTrim.sort(function(a, b) { return b - a; }); // 내림차순
                  var nTrim = validTrim.length;
                  var thrS = Infinity, thrA = Infinity, thrB = Infinity;
                  if (nTrim > 0) {
                    var idxS = Math.max(0, Math.floor(nTrim * 0.05) - 1);
                    var idxA = Math.max(0, Math.floor(nTrim * 0.20) - 1);
                    var idxB = Math.max(0, Math.floor(nTrim * 0.40) - 1);
                    thrS = validTrim[idxS];
                    thrA = validTrim[idxA];
                    thrB = validTrim[idxB];
                  }

                  var tierCounts = { S:0, A:0, B:0, C:0 };
                  var tierRows = [];

                  // SCORE 그래프에서 계산된 날짜별 대표 트윗 메타 데이터 재사용
                  var metaArr = (window.csvScoreChartInstance && csvScoreChartInstance.$dateTweetMeta)
                    ? csvScoreChartInstance.$dateTweetMeta
                    : null;

                  for (var idx = 0; idx < trimmed.length; idx++) {
                    var v = trimmed[idx];
                    if (typeof v !== "number" || isNaN(v)) continue;

                    var labelDate = dates[idx] || "";
                    // 분포 기반 티어 매핑
                    var t = "C";
                    if (nTrim > 0) {
                      if (v >= thrS) t = "S";
                      else if (v >= thrA) t = "A";
                      else if (v >= thrB) t = "B";
                    }
                    tierCounts[t] += 1;

                    var meta = metaArr && metaArr[idx] ? metaArr[idx] : null;
                    if (!meta) {
                      // fallback: byDate에서 해당 날짜의 가장 높은 스코어 트윗 찾기
                      var rawKey = rawDates[idx];
                      var dayInfo = byDate && rawKey && byDate[rawKey] ? byDate[rawKey] : null;
                      if (dayInfo && dayInfo.tweets && dayInfo.tweets.length) {
                        var best = dayInfo.tweets[0];
                        for (var di = 1; di < dayInfo.tweets.length; di++) {
                          var cand = dayInfo.tweets[di];
                          if (!cand) continue;
                          if (typeof cand.score === "number" && typeof best.score === "number") {
                            if (cand.score > best.score) best = cand;
                          }
                        }
                        meta = best;
                      } else {
                        meta = {};
                      }
                    }
                    var snippet = meta && meta.text ? String(meta.text) : "";
                    var url = meta && meta.url ? String(meta.url) : "";

                    var likes   = (meta && typeof meta.likes === "number") ? meta.likes : null;
                    var replies = (meta && typeof meta.replies === "number") ? meta.replies : null;
                    var rts     = (meta && typeof meta.retweets === "number") ? meta.retweets : null;
                    var quotes  = (meta && typeof meta.quotes === "number") ? meta.quotes : null;

                    tierRows.push({
                      date: labelDate,
                      tier: t,
                      score: v,
                      snippet: snippet,
                      url: url,
                      likes: likes,
                      replies: replies,
                      retweets: rts,
                      quotes: quotes
                    });
                  }

                  window.csvTierSummary = {
                    counts: tierCounts,
                    rows: tierRows
                  };


                  if (typeof renderTierExplosionTop === "function") {
                    renderTierExplosionTop();
                  }
                  if (typeof renderTierFilterList === "function") {
                    renderTierFilterList("ALL");
                  }


          // ---- 코치봇 텍스트 ----
                  var coachEl = document.getElementById("csvCoachText");
                  if (coachEl) {
                    var sum = 0, cnt = 0;
                    for (var ci = 0; ci < trimmed.length; ci++) {
                      var vv = trimmed[ci];
                      if (typeof vv === "number" && !isNaN(vv)) {
                        sum += vv;
                        cnt += 1;
                      }
                    }
                    var avgTrim = cnt ? (sum / cnt) : 0;

                    var sum7 = 0, cnt7 = 0;
                    var start7 = Math.max(0, trimmed.length - 7);
                    for (var i7 = start7; i7 < trimmed.length; i7++) {
                      var vv7 = trimmed[i7];
                      if (typeof vv7 === "number" && !isNaN(vv7)) {
                        sum7 += vv7;
                        cnt7 += 1;
                      }
                    }
                    var avgLast7 = cnt7 ? (sum7 / cnt7) : avgTrim;

                    // 상단 대시보드용 CSV 기반 요약값 저장
                    window.csvMindshareStats = {
                      trimmedScore: avgLast7,
                      accountAverageScore: avgTrim
                    };
                    if (typeof updateDashboardMindshareCardFromCsv === "function") {
                      updateDashboardMindshareCardFromCsv(window.csvMindshareStats);
                    }



                    var trendText = "";
                    if (avgLast7 > avgTrim + 0.5) {
                      trendText = "최근 7일의 점수가 전체 평균보다 높아서 계정 컨디션이 올라오는 구간입니다.";
                    } else if (avgLast7 < avgTrim - 0.5) {
                      trendText = "최근 7일의 점수가 전체 평균보다 낮아서 잠시 쉬어가거나 방향 점검이 필요한 타이밍입니다.";
                    } else {
                      trendText = "최근 7일의 점수가 전체 평균과 비슷한 안정 구간입니다.";
                    }

                    var text = "";
                    text += "① 전체 기간 평균 Trimmed Score는 약 " + avgTrim.toFixed(2) + "점입니다.\n";
                    text += "② 최근 7일 평균은 약 " + avgLast7.toFixed(2) + "점으로, " + trendText + "\n";
                    text += "③ 활동량 기준으로는 " + labelTopPostDow + "에 글을 가장 많이 올렸고, 반응이 좋은 요일은 " + labelTopScoreDow + "입니다.\n";
                    text += "④ 시간대 데이터는 현재 CSV에서 충분하지 않아, 우선 요일 패턴 중심으로 업로드 타이밍을 맞추는 것을 추천합니다.\n";
                    text += "⑤ 점수에만 매달리기보다는, 다양한 형식의 포스트를 실험하면서 패턴을 유지해보세요.";

                    coachEl.textContent = text;
                  }
                }


              // 티어 이모지 매핑
              var tierEmojiMap = { S: "💎", A: "⭐", B: "📈", C: "📘" };

              function buildTierLabel(tier) {
                var base = tier || "";
                var emoji = tierEmojiMap[base] || "";
                return emoji ? (emoji + " " + base) : base;
              }

              function buildReactionSummary(row) {
                if (!row) return "-";
                var parts = [];
                if (typeof row.likes === "number" && !isNaN(row.likes)) {
                  parts.push("❤️ " + row.likes);
                }
                if (typeof row.replies === "number" && !isNaN(row.replies)) {
                  parts.push("💬 " + row.replies);
                }
                if (typeof row.retweets === "number" && !isNaN(row.retweets)) {
                  parts.push("🔁 " + row.retweets);
                }
                if (typeof row.quotes === "number" && !isNaN(row.quotes)) {
                  parts.push("🧾 " + row.quotes);
                }
                return parts.length ? parts.join(" · ") : "-";
              }

              // 티어 탭용 헬퍼 함수들
              function getTierRows() {
                var summary = window.csvTierSummary || {};
                return summary.rows || [];
              }

              // 마인드쉐어 폭발 Top10 렌더링
              function renderTierExplosionTop() {
                // 마인드쉐어 폭발 Top 10은 날짜별 대표 트윗이나 요약본이 아니라
                // csvAllPosts(= CSV에서 추출된 모든 원글/게시글)의 SCORE 기준 상위 10개로만 계산한다.
                var allRows = (window.csvAllPosts || []).slice();
                var tbody = document.getElementById("tierExplosionBody");
                var countEl = document.getElementById("tierExplosionCountLabel");
                if (!tbody) return;
                tbody.innerHTML = "";

                var total = allRows.length;
                // SCORE 기준 내림차순 정렬
                allRows.sort(function(a, b) { return b.score - a.score; });
                // 상위 10개만 추출
                var top = allRows.slice(0, 10);

                if (countEl) {
                  countEl.textContent = "(" + top.length + " / " + total + ")";
                }

                if (!top.length) {
                  var trEmpty = document.createElement("tr");
                  var tdEmpty = document.createElement("td");
                  tdEmpty.colSpan = 7;
                  tdEmpty.textContent = "티어를 계산할 수 있는 데이터가 없습니다.";
                  trEmpty.appendChild(tdEmpty);
                  tbody.appendChild(trEmpty);
                  return;
                }

                for (var i = 0; i < top.length; i++) {
                  var row = top[i];
                  var tr = document.createElement("tr");

                  var tdRank = document.createElement("td");
                  tdRank.textContent = (i + 1);

                  var tdTier = document.createElement("td");
                  tdTier.textContent = buildTierLabel(row.tier);

                  var tdText = document.createElement("td");
                  var safeText = (row.snippet || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                  tdText.textContent = safeText || "(대표 트윗 텍스트 없음)";

                  var tdScore = document.createElement("td");
                  tdScore.textContent = row.score.toFixed(2);

                  var tdReact = document.createElement("td");
                  tdReact.textContent = buildReactionSummary(row);

                  var tdDate = document.createElement("td");
                  tdDate.textContent = row.date || "-";

                  var tdLink = document.createElement("td");
                  if (row.url) {
                    var a = document.createElement("a");
                    a.href = row.url;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.textContent = "트윗 보기";
                    tdLink.appendChild(a);
                  } else {
                    tdLink.textContent = "-";
                  }

                  tr.appendChild(tdRank);
                  tr.appendChild(tdTier);
                  tr.appendChild(tdText);
                  tr.appendChild(tdScore);
                  tr.appendChild(tdReact);
                  tr.appendChild(tdDate);
                  tr.appendChild(tdLink);
                  tbody.appendChild(tr);
                }
              }


              // 티어별 상위 게시글 렌더링
              function renderTierFilterList(filterTier) {
                if (!filterTier) filterTier = "ALL";
                window.csvTierCurrentFilter = filterTier;

                var allRows = getTierRows().slice();
                if (filterTier !== "ALL") {
                  allRows = allRows.filter(function(r) { return r.tier === filterTier; });
                }
                allRows.sort(function(a, b) { return b.score - a.score; });

                var tbody = document.getElementById("tierGradeBody");
                if (!tbody) return;
                tbody.innerHTML = "";

                if (!allRows.length) {
                  var trEmpty = document.createElement("tr");
                  var tdEmpty = document.createElement("td");
                  tdEmpty.colSpan = 6;
                  tdEmpty.textContent = "해당 티어에서 보여줄 수 있는 게시글이 없습니다.";
                  trEmpty.appendChild(tdEmpty);
                  tbody.appendChild(trEmpty);
                  return;
                }

                for (var i = 0; i < allRows.length; i++) {
                  var row = allRows[i];
                  var tr = document.createElement("tr");

                  var tdRank = document.createElement("td");
                  tdRank.textContent = (i + 1);

                  var tdTier = document.createElement("td");
                  tdTier.textContent = buildTierLabel(row.tier);

                  var tdText = document.createElement("td");
                  var safeText = (row.snippet || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                  tdText.textContent = safeText || "(대표 트윗 텍스트 없음)";

                  var tdScore = document.createElement("td");
                  tdScore.textContent = row.score.toFixed(2);

                  var tdReact = document.createElement("td");
                  tdReact.textContent = buildReactionSummary(row);

                  var tdDate = document.createElement("td");
                  tdDate.textContent = row.date || "-";

                  var tdLink = document.createElement("td");
                  if (row.url) {
                    var a = document.createElement("a");
                    a.href = row.url;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.textContent = "트윗 보기";
                    tdLink.appendChild(a);
                  } else {
                    tdLink.textContent = "-";
                  }

                  tr.appendChild(tdRank);
                  tr.appendChild(tdTier);
                  tr.appendChild(tdText);
                  tr.appendChild(tdScore);
                  tr.appendChild(tdReact);
                  tr.appendChild(tdDate);
                  tr.appendChild(tdLink);
                  tbody.appendChild(tr);
                }
              }

          function formatKoreanDateKey(dKey) {
                if (!dKey) return "";
                var parts = String(dKey).split("-");
                if (parts.length !== 3) return dKey;
                var m = parts[1];
                var d = parts[2];
                if (m.length === 2 && m.charAt(0) === "0") m = m.slice(1);
                if (d.length === 2 && d.charAt(0) === "0") d = d.slice(1);
                return m + "월 " + d + "일";
              }

              function computeScore(p){
            var impres = p.impressions || 0;
            var raw =
                (p.engagements || 0) +
                (p.bookmarks || 0) * 3 +
                (p.newFollows || 0) * 10 +
                (p.profileClicks || 0) * 0.7 +
                (p.urlClicks || 0) * 0.8 +
                (p.uniqueClicks || 0) * 1.2 +
                (p.likes || 0) * 1.2 +
                (p.retweets || 0) * 2 +
                (p.replies || 0) * 1.5 +
                (p.shares || 0) * 1.8;
            return raw / Math.log10(impres + 10);
          }

          
function buildChartFromRows(rows) {
                  if (!rows || !rows.length) return;

                  // 원글 단위 점수/티어 계산용 리스트 초기화
                  window.csvAllPosts = [];

                  var columns = Object.keys(rows[0] || {});
                  if (!columns.length) return;
                  if (!window.__muddhaColumnsLogged) {
                    console.log("CSV available columns:", columns);
                    window.__muddhaColumnsLogged = true;
                  }

                  var dateKey       = findColumn(columns, ["time", "date", "날짜", "작성일"]);
                  var impKey        = findColumn(columns, ["impression", "impressions", "노출", "조회수"]);
                  // 반응 컬럼들은 X CSV 포맷이 바뀌어도 잘 잡히도록 최대한 다양한 후보를 넣어둔다.
                  var likeKey       = findColumn(columns, ["like", "likes", "like_count", "favorite", "favorites", "favs", "좋아요", "좋아요 수", "좋아요수", "좋아요수(회)", "마음에 들어요", "마음에 들어요 수"]);
                  var rtKey         = findColumn(columns, ["retweet", "retweets", "retweet_count", "리트윗", "리포스트", "리포스트 수"]);
                  var engagementKey = findColumn(columns, ["engagement", "engagements", "참여수", "참여 수"]);
                  var replyKey      = findColumn(columns, ["reply", "replies", "댓글", "댓글 수", "답글"]);
                  var quoteKey      = findColumn(columns, ["quote", "quotes", "인용", "인용 트윗", "quoted", "quote_count"]);
                  var bookmarkKey   = findColumn(columns, ["bookmark", "bookmarks", "bookmark_count", "북마크", "북마크 수"]);
                  // 트윗 유형/답글 여부 컬럼(있으면) 탐색
                  var tweetTypeKey  = findColumn(columns, ["tweet_type", "tweet type", "트윗 유형", "트윗 타입", "유형"]);
                  var inReplyIdKey  = findColumn(columns, ["in_reply_to_tweet_id", "in_reply_to_status_id", "답글 대상 트윗 id"]);

                  // 디버깅용: 어떤 컬럼이 매핑됐는지 콘솔에 한 번만 찍기
                  try {
                    if (!window.__muddhaDebugPrinted) {
                      console.log("CSV metric columns:", {
                        dateKey: dateKey,
                        impKey: impKey,
                        likeKey: likeKey,
                        rtKey: rtKey,
                        engagementKey: engagementKey,
                        replyKey: replyKey,
                        quoteKey: quoteKey,
                        bookmarkKey: bookmarkKey,
                        tweetTypeKey: tweetTypeKey,
                        inReplyIdKey: inReplyIdKey
                      });
                      window.__muddhaDebugPrinted = true;
                    }
                  } catch (e) {}
 var tweetUrlKey = findColumn(columns, ["permalink", "tweet_permalink", "url", "tweet url", "링크", "트윗 링크"]);
                  var tweetIdKey = findColumn(columns, ["tweet_id", "status_id", "id", "트윗id"]);

                  // 업로드 요약 정보 박스 업데이트
                  if (summaryBox) {
                    var rowCount = rows.length;
                    var colCount = columns.length;
                    var dateColLabel = dateKey || "감지 실패";
                    summaryBox.innerHTML =
                      "총 <b>" + rowCount + "</b>행 / 컬럼 <b>" + colCount + "</b>개<br>" +
                      "날짜 컬럼: <b>" + dateColLabel + "</b>";
                  }

                  var textKey = findColumn(columns, [
                    "full_text", "full text", "tweet_text", "tweet text",
                    "text", "내용", "본문", "트윗", "트윗 내용", "tweet"
                  ]);

                  var byDate = {};

                  rows.forEach(function (row) {
                    // 옛날 분석기와 동일하게: 내용이 없거나 @로 시작하는 글(멘션)은 제외
                    var tweetText = textKey ? String(row[textKey] || "").trim() : "";
                    if (!tweetText || tweetText.charAt(0) === "@"){ return; }

                    // CSV에 트윗 유형/답글 ID 컬럼이 있으면 답글은 추가로 한 번 더 걸러준다.
                    var isReplyRow = false;
                    if (tweetTypeKey) {
                      var tt = String(row[tweetTypeKey] || "").toLowerCase();
                      if (tt.indexOf("reply") !== -1 || tt.indexOf("답글") !== -1) {
                        isReplyRow = true;
                      }
                    }
                    if (!isReplyRow && inReplyIdKey) {
                      var rv = row[inReplyIdKey];
                      if (rv !== null && rv !== undefined && String(rv).trim() !== "") {
                        isReplyRow = true;
                      }
                    }
                    if (isReplyRow) { return; }



                    var d = parseDateStr(row, dateKey) || "unknown";
                    if (!byDate[d]) {
                      byDate[d] = { scores: [], tweets: [] };
                    }

                    var impVal      = impKey      ? toNumber(row[impKey])      : 0;
                    var likeVal     = likeKey     ? toNumber(row[likeKey])     : 0;
                    var rtVal       = rtKey       ? toNumber(row[rtKey])       : 0;
                    var replyVal    = replyKey    ? toNumber(row[replyKey])    : 0;
                    var quoteVal    = quoteKey    ? toNumber(row[quoteKey])    : 0;
                    var bookmarkVal = bookmarkKey ? toNumber(row[bookmarkKey]) : 0;

                    var engagementsVal;
                    if (engagementKey) {
                      engagementsVal = toNumber(row[engagementKey]);
                    } else {
                      engagementsVal = likeVal + rtVal + replyVal + quoteVal + bookmarkVal;
                    }

                    var base = computeScore({
                      impressions: impVal,
                      engagements: engagementsVal,
                      bookmarks: bookmarkVal,
                      newFollows: 0,
                      profileClicks: 0,
                      urlClicks: 0,
                      uniqueClicks: 0,
                      likes: likeVal,
                      retweets: rtVal,
                      replies: replyVal,
                      shares: quoteVal
                    });

                    byDate[d].scores.push(base);

                    // 트윗 링크 또는 트윗 ID를 이용해 상세보기용 메타데이터 저장
                    // tweetText는 상단에서 이미 계산됨
                    var finalLink = null;

                    if (tweetUrlKey) {
                      var rawLink = row[tweetUrlKey];
                      if (rawLink) {
                        var link = String(rawLink).trim();
                        if (link) {
                          // 이미 http/https로 시작하면 그대로 사용
                          if (/^https?:\/\//i.test(link)) {
                            finalLink = link;
                          } else {
                            // 프로토콜이 없고, 도메인 형태라면 https를 붙여준다.
                            if (/^(x\.com|twitter\.com|t\.co)/i.test(link)) {
                              finalLink = "https://" + link;
                            }
                            // 그 외의 값(숫자 등)은 유효한 URL이 아니라고 보고 무시하고,
                            // 아래의 텍스트/ID 기반 링크 추출 로직으로 넘긴다.
                          }
                        }
                      }
                    }

                    // URL 컬럼이 없거나 비어 있으면, 텍스트 안에서 첫 번째 링크를 추출해 사용
                    if (!finalLink && tweetText) {
                      var match = tweetText.match(/https?:\/\/\S+/);
                      if (match && match[0]) {
                        finalLink = match[0];
                      }
                    }

                    if (!finalLink && tweetIdKey) {
                      var idRaw = row[tweetIdKey];
                      if (idRaw) {
                        var idStr = String(idRaw).trim();
                        if (/^https?:\/\//i.test(idStr)) {
                          finalLink = idStr;
                        } else if (idStr) {
                          finalLink = "https://x.com/i/status/" + idStr;
                        }
                      }
                    }

                    // 좋아요/답글/재게시/인용/노출 등 메타 정보도 함께 저장
                    var impVal      = impKey      ? toNumber(row[impKey])      : 0;
                    var likeVal     = likeKey     ? toNumber(row[likeKey])     : 0;
                    var rtVal       = rtKey       ? toNumber(row[rtKey])       : 0;
                    var replyVal    = replyKey    ? toNumber(row[replyKey])    : 0;
                    var quoteVal    = quoteKey    ? toNumber(row[quoteKey])    : 0;
                    var bookmarkVal = bookmarkKey ? toNumber(row[bookmarkKey]) : 0;

                    if (finalLink || tweetText) {
                      var postObj = {
                        dateKey: d,
                        date: formatKoreanDateKey(d),
                        score: base,
                        url: finalLink,
                        snippet: tweetText,
                        impressions: impVal,
                        likes: likeVal,
                        retweets: rtVal,
                        replies: replyVal,
                        quotes: quoteVal,
                        bookmarks: bookmarkVal
                      };
                      window.csvAllPosts.push(postObj);

                      byDate[d].tweets.push({
                        score: base,
                        url: finalLink,
                        text: tweetText,
                        impressions: impVal,
                        likes: likeVal,
                        retweets: rtVal,
                        replies: replyVal,
                        quotes: quoteVal,
                        bookmarks: bookmarkVal
                      });
                    }
                  });

                  var rawDates = Object.keys(byDate).sort();
                  if (!rawDates.length) return;

          // === 전체 기간 기준 트림드 컷 계산 ===
                  var allScores = (window.csvAllPosts || []).map(function (p) {
                    return p && typeof p.score === "number" ? p.score : null;
                  }).filter(function (v) {
                    return v !== null && !isNaN(v);
                  }).sort(function (a, b) { return a - b; });

                  var globalLow = null;
                  var globalHigh = null;
                  if (allScores.length) {
                    var nAll = allScores.length;
                    var kAll = Math.floor(nAll * 0.1);
                    if (kAll * 2 >= nAll) {
                      kAll = 0;
                    }
                    var trimmedGlobal = allScores.slice(kAll, nAll - kAll);
                    if (!trimmedGlobal.length) {
                      trimmedGlobal = allScores.slice();
                    }
                    globalLow = trimmedGlobal[0];
                    globalHigh = trimmedGlobal[trimmedGlobal.length - 1];
                  }
                  window.csvGlobalTrimBounds = { low: globalLow, high: globalHigh };

                  var dates = [];
                  var avgScores = [];
                  var trimmedDailyScores = [];
                  var dateTweetMeta = [];

                  rawDates.forEach(function (dKey) {
                    var info = byDate[dKey];
                    var scores = info.scores || [];
                    if (!scores.length) {
                      dates.push(formatKoreanDateKey(dKey));
                      avgScores.push(0);
                      trimmedDailyScores.push(0);
                      dateTweetMeta.push(null);
                      return;
                    }

                    // 일자별 평균
                    var sum = scores.reduce(function (s, v) { return s + v; }, 0);
                    var avg = sum / scores.length;
                    avgScores.push(avg);

                    // 전체 기간 기준 트림드 평균 (상/하위 10%를 전체 분포에서 한 번만 잘라서 사용)
                    var trimmedArrForDay = scores;
                    if (globalLow !== null && globalHigh !== null &&
                        !isNaN(globalLow) && !isNaN(globalHigh)) {
                      trimmedArrForDay = scores.filter(function (v) {
                        return v >= globalLow && v <= globalHigh;
                      });
                    }
                    var trimmed =
                      trimmedArrForDay.length
                        ? trimmedArrForDay.reduce(function (s, v) { return s + v; }, 0) / trimmedArrForDay.length
                        : avg;
                    trimmedDailyScores.push(trimmed);

                    // 차트 라벨용 날짜
                    dates.push(formatKoreanDateKey(dKey));

                    // 해당 날짜에서 가장 점수가 높은 트윗 저장
                    var bestTweet = null;
                    if (info.tweets && info.tweets.length) {
                      var best = null;
                      info.tweets.forEach(function (t) {
                        if (!t) return;
                        if (!best) {
                          best = t;
                        } else if (typeof t.score === "number" && typeof best.score === "number") {
                          if (t.score > best.score) best = t;
                        }
                      });
                      if (best) bestTweet = best;
                    }
                    dateTweetMeta.push(bestTweet);
                  });

                  if (!chartCanvas) return;
                  var ctx = chartCanvas.getContext("2d");
                  if (csvScoreChartInstance) {
                    csvScoreChartInstance.destroy();
                  }

                  // 트림드 > 평균 돌파 포인트
                  var crossingPoints = dates.map(function (_, idx) {
                    var a = avgScores[idx];
                    var t = trimmedDailyScores[idx];
                    if (t != null && a != null && !isNaN(t) && !isNaN(a) && t > a) {
                      return t;
                    }
                    return null;
                  });

                  // 트림드 신 고점 포인트
                  var highPoints = [];
                  var runningHigh = -Infinity;
                  trimmedDailyScores.forEach(function (t, idx) {
                    if (t != null && !isNaN(t)) {
                      if (t > runningHigh) {
                        runningHigh = t;
                        highPoints[idx] = t;
                      } else {
                        highPoints[idx] = null;
                      }
                    } else {
                      highPoints[idx] = null;
                    }
                  });

                  csvScoreChartInstance = new Chart(ctx, {
                    type: "line",
                    data: {
                      labels: dates,
                      datasets: [
                        {
                          label: "일자별 평균 스코어",
                          data: avgScores,
                          borderWidth: 2,
                          tension: 0.25,
                          pointRadius: 3,
                          borderColor: "#3b82f6",
                          backgroundColor: "#3b82f6"
                        },
                        {
                          label: "일자별 트림드 스코어",
                          data: trimmedDailyScores,
                          borderWidth: 2,
                          tension: 0.25,
                          pointRadius: 3,
                          borderColor: "#ec4899",
                          backgroundColor: "#ec4899"
                        },
                        {
                          label: "트림드 > 평균 돌파",
                          data: crossingPoints,
                          borderWidth: 0,
                          pointRadius: 6,
                          pointHoverRadius: 7,
                          showLine: false,
                          borderColor: "#facc15",
                          backgroundColor: "#facc15"
                        },
                        {
                          label: "트림드 신 고점",
                          data: highPoints,
                          borderWidth: 0,
                          pointRadius: 6,
                          pointHoverRadius: 7,
                          showLine: false,
                          borderColor: "#a855f7",
                          backgroundColor: "#a855f7"
                        }
                      ]
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          ticks: {
                            maxRotation: 60,
                            minRotation: 45,
                            autoSkip: true
                          }
                        },
                        y: {
                          beginAtZero: true
                        }
                      },
                      interaction: {
                        mode: "index",
                        intersect: false,
                        axis: "x"
                      },
                      plugins: {
                        legend: {
                          labels: {
                            font: { size: 11 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function (ctx) {
                              var v = ctx.parsed.y;
                              return ctx.dataset.label + ": " + (v != null ? v.toFixed(2) : "-");
                            }
                          }
                        }
                      },
                      onClick: function (evt, activeEls) {
                        var points = csvScoreChartInstance.getElementsAtEventForMode(
                          evt,
                          "index",
                          { intersect: false },
                          false
                        );
                        if (!points || !points.length) return;
                        var first = points[0];
                        var index = first.index;
                        if (!csvScoreChartInstance.$dateTweetMeta) return;
                        var metaArr = csvScoreChartInstance.$dateTweetMeta;
                        var meta = metaArr[index];
                        var detailBox = document.getElementById("csvScoreDetailBody");
                        if (!detailBox) return;

                        if (!meta || (!meta.url && !meta.text)) {
                          detailBox.innerHTML = "<p class=\"csv-score-detail-meta\">선택된 날짜의 대표 트윗 데이터를 찾을 수 없습니다.</p>";
                          return;
                        }

                        var labelDate = csvScoreChartInstance.data.labels[index] || "";
                        var scoreVal = null;
                        if (csvScoreChartInstance.data.datasets[0] &&
                            csvScoreChartInstance.data.datasets[0].data &&
                            typeof csvScoreChartInstance.data.datasets[0].data[index] === "number") {
                          scoreVal = csvScoreChartInstance.data.datasets[0].data[index];
                        }

                        var safeText = (meta.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

                        var html = "";
                        html += "<div class=\"csv-score-detail-meta\">" + labelDate;
                        if (scoreVal != null) {
                          html += " · 평균 스코어 " + scoreVal.toFixed(2);
                        }
                        html += "</div>";
                        if (safeText) {
                          html += "<p>" + safeText + "</p>";
                        } else {
                          html += "<p>이 날짜의 대표 트윗 텍스트를 불러오지 못했습니다.</p>";
                        }
                        if (meta.url) {
                          html += "<a class=\"csv-score-detail-link\" href=\"" + meta.url + "\" target=\"_blank\" rel=\"noopener noreferrer\">X에서 트윗 보기</a>";
                        }
                        detailBox.innerHTML = html;
                      }
                    }
                  });

                  // 차트 전체 데이터 저장 (기간 필터용)
                  csvScoreChartInstance.$allDates = dates.slice();
                  csvScoreChartInstance.$allAvgScores = avgScores.slice();
                  csvScoreChartInstance.$allTrimmedScores = trimmedDailyScores.slice();
                  csvScoreChartInstance.$allCrossing = crossingPoints.slice();
                  csvScoreChartInstance.$allHighs = highPoints.slice();
                  csvScoreChartInstance.$allTweetMeta = dateTweetMeta.slice();
                  csvScoreChartInstance.$dateTweetMeta = dateTweetMeta.slice();

                  // === 활동 패턴 / 티어 / 코치봇용 추가 분석 ===
                  try {
                    updateCsvPatternAndTier({
                      rawDates: rawDates,
                      byDate: byDate,
                      dates: dates,
                      avgScores: avgScores,
                      trimmedDailyScores: trimmedDailyScores
                    });
                  } catch (e) {
                    console.warn("CSV 패턴/티어 분석 실패", e);
                  }

                  // 등급/티어를 원글 기준으로 다시 계산 (옛날 분석기와 동일)
                  recomputeTierFromPosts();


                  function applyRange(range) {
                    var total = csvScoreChartInstance.$allDates.length;
                    var count;
                    if (range === "7") count = 7;
                    else if (range === "30") count = 30;
                    else if (range === "60") count = 60;
                    else if (range === "90") count = 90;
                    else count = total;

                    count = Math.min(count, total);
                    var start = total - count;

                    var labels = csvScoreChartInstance.$allDates.slice(start);
                    var avg = csvScoreChartInstance.$allAvgScores.slice(start);
                    var trimmed = csvScoreChartInstance.$allTrimmedScores.slice(start);
                    var cross = csvScoreChartInstance.$allCrossing.slice(start);
                    var highs = csvScoreChartInstance.$allHighs.slice(start);
                    var meta = csvScoreChartInstance.$allTweetMeta.slice(start);

                    csvScoreChartInstance.data.labels = labels;
                    csvScoreChartInstance.data.datasets[0].data = avg;
                    csvScoreChartInstance.data.datasets[1].data = trimmed;
                    csvScoreChartInstance.data.datasets[2].data = cross;
                    csvScoreChartInstance.data.datasets[3].data = highs;
                    csvScoreChartInstance.$dateTweetMeta = meta;
                    csvScoreChartInstance.update();
                  }

                  // 범위 버튼 처리
                  var rangeButtons = document.querySelectorAll(".csv-range-btn");
                  rangeButtons.forEach(function (btn) {
                    btn.onclick = function () {
                      var r = btn.getAttribute("data-range");
                      rangeButtons.forEach(function (b) { b.classList.remove("active"); });
                      btn.classList.add("active");
                      applyRange(r);
                    };
                  });

                  // 기본 TOTAL
                  applyRange("all");

                  // SCORE 그래프 탭으로 자동 전환
                  showCsvPanel("score");
                }
          function handleCsvFile(file) {
  // CSV 파일 업로드 & 파싱은 parseCsvFile에서 처리
  parseCsvFile(file, function (rows) {
    if (!rows || !rows.length) return;

    // --- 여러 CSV를 누적해서 사용하는 통합 모드 ---
    // 기존에 누적된 원본 행 리스트가 있으면 가져오고, 없으면 새로 만든다.
    window.csvAccumRows = window.csvAccumRows || [];

    // 행에서 고유 키를 뽑는 헬퍼 (ID > URL > 텍스트+날짜)
    function getRowKey(row) {
      if (!row) return "";
      var id =
        row.tweet_id ||
        row["tweet_id"] ||
        row["트윗 ID"] ||
        row["트윗id"] ||
        row["id"] ||
        row["ID"];
      var url =
        row["url"] ||
        row["URL"] ||
        row["링크"] ||
        row["트윗 링크"] ||
        row["Tweet permalink"] ||
        row["permalink"];
      var text =
        row["게시물 본문"] ||
        row["Post text"] ||
        row["Tweet text"] ||
        row["ツイートテキスト"];
      var date =
        row["날짜"] ||
        row["작성일"] ||
        row["Date"] ||
        row["date"];

      if (id) return "id:" + String(id).trim();
      if (url) return "url:" + String(url).trim();
      return "txt:" + String(text || "").trim() + "|d:" + String(date || "").trim();
    }

    var existingKeys = {};
    window.csvAccumRows.forEach(function (r) {
      var k = r.__muddhaKey || getRowKey(r);
      r.__muddhaKey = k;
      existingKeys[k] = true;
    });

    rows.forEach(function (r) {
      var k = getRowKey(r);
      if (!k) return;
      if (!existingKeys[k]) {
        existingKeys[k] = true;
        r.__muddhaKey = k;
        window.csvAccumRows.push(r);
      }
    });

    // localStorage에 통합 데이터 저장은 csvStore에서 관리
    setAccumRows(window.csvAccumRows);

    // 누적된 전체 데이터를 기준으로 다시 분석 + 월별 필터 옵션 갱신
    populateMonthFilterFromRows(window.csvAccumRows);
    rebuildCsvViewForMonth(window.csvMonthFilterValue || "ALL");
  });
}



                if (analyzeBtn) {
                  analyzeBtn.addEventListener("click", function () {
                    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                      if (fileInput) fileInput.click();
                      else alert("CSV 파일 입력 요소를 찾지 못했어요.");
                      return;
                    }
                    handleCsvFile(fileInput.files[0]);
                  });
                }

                if (fileInput) {
                  fileInput.addEventListener("change", function () {
                    if (fileInput.files && fileInput.files[0]) {
                      // 파일을 선택하면 바로 분석하기
                      handleCsvFile(fileInput.files[0]);
                    }
                  });
                }

                // 페이지 로드시 localStorage에 저장된 CSV 통합 데이터를 자동 복원
                const loadedRows = loadAccumRowsFromStorage();
                if (loadedRows && loadedRows.length) {
                  populateMonthFilterFromRows(loadedRows);
                  rebuildCsvViewForMonth(window.csvMonthFilterValue || "ALL");
                }
              });



const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".tab-panel");
    const scrollContainer = document.getElementById("scrollContainer");
    const topTitle = document.querySelector(".top-title");
    const topSubtitle = document.querySelector(".top-subtitle");

    const titles = {
      "tab-dashboard": [" "],
      "tab-guide": ["사용방법", "MUDDHA Mindshare를 어떻게 활용할지에 대한 안내"],
      "tab-csv": ["CSV 분석", "X/Twitter CSV를 업로드해서 내 활동을 정제하고 분석하는 화면"],
      "tab-project": ["프로젝트별 마인드쉐어", "내가 자주 언급하는 프로젝트들의 Mindshare 비교"],
      "tab-planner": ["야핑 플래너", "앞으로의 야핑 계획을 세우는 플래너"],
      "tab-kaito": ["KAITO 리더보드", "KAITO 기반 YAP 리더보드 및 관련 실험"],
      "tab-yap": ["YAPS +", "YAP 곡선, 히스토리, 실험 기능 모음"],
      "tab-cookie": ["Cookie 리더보드", "Cookie 생태계에서의 랭킹과 포지션"],
      "tab-community": ["커뮤니티", "메모, 초안, 링크를 모아두는 공간"],
      "tab-profile": ["내 프로필", "프로필 정보와 활동 히스토리를 한 번에 보는 화면"]
    };

    navItems.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");

        navItems.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        panels.forEach(panel => {
          if (panel.id === target) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        });

        if (scrollContainer) scrollContainer.scrollTop = 0;

        if (titles[target]) {
          topTitle.textContent = titles[target][0];
          topSubtitle.textContent = titles[target][1];
        }
      });
    });

const SUPABASE_URL = "https://ajzgeshowxalnnmemowv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqemdlc2hvd3hhbG5ubWVtb3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDM1NjEsImV4cCI6MjA3OTkxOTU2MX0.6VrDH1RPT_TTwkN2hwOsEsP8xnv2fZIsFXvWkvy_qm4";
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    window.muddhaProfileReload = async function () {
      try {
        const sessionRes = await supabaseClient.auth.getSession();
        if (!sessionRes || !sessionRes.data || !sessionRes.data.session) {
          return;
        }
        const user = sessionRes.data.session.user;
        if (!user) return;

        var userId = user.id;

        var profRes;
        try {
          profRes = await supabaseClient
            .from("profiles")
            .select("nickname, handle, x_handle")
            .eq("id", userId)
            .limit(1);
        } catch (e) {
          console.warn("profiles select error:", e);
          profRes = null;
        }

        var profileRow = null;
        if (profRes && !profRes.error && profRes.data && profRes.data.length > 0) {
          profileRow = profRes.data[0];
        }

        var nickname = profileRow && profileRow.nickname ? profileRow.nickname : "";
        var handle = "";
        if (profileRow) {
          if (profileRow.x_handle) handle = profileRow.x_handle;
          else if (profileRow.handle) handle = profileRow.handle;
        }

        var displayName = nickname || "크리에이터";
        var handleText = handle ? "@" + handle : "@handle_미설정";

        var avatarUrl = handle
          ? ("https://unavatar.io/twitter/" + handle)
          : "https://unavatar.io/twitter/bud_dha__";

        // 프로필 탭 미리보기 업데이트
        var avatarEl = document.getElementById("profileAvatar");
        if (avatarEl) avatarEl.src = avatarUrl;

        var namePrev = document.getElementById("profileNamePreview");
        if (namePrev) namePrev.textContent = displayName;

        var handlePrev = document.getElementById("profileHandlePreview");
        if (handlePrev) handlePrev.textContent = handleText;

        var displayNameInput = document.getElementById("profileDisplayName");
        if (displayNameInput) displayNameInput.value = nickname || "";

        var handleInput = document.getElementById("profileTwitterHandle");
        if (handleInput) handleInput.value = handle || "";

        // 상단 Mindshare 카드의 사용자 정보 업데이트
        var dashAvatar = document.getElementById("dashboardUserAvatar");
        if (dashAvatar) dashAvatar.src = avatarUrl;

        var dashName = document.getElementById("dashboardUserName");
        if (dashName) dashName.textContent = displayName;

        var dashHandle = document.getElementById("dashboardUserHandle");
        if (dashHandle) dashHandle.textContent = handleText;
      } catch (e) {
        console.warn("muddhaProfileReload error:", e);
      }
    };


    function muddhaIdToEmail(idRaw){
      const id = (idRaw || "").trim();
      if(!id) return "";
      if(id.includes("@")) return id;
      return id + "@muddha-id.com";
    }

    async function muddhaHandleLogin(){
      const idInput = document.getElementById("loginId");
      const pwInput = document.getElementById("loginPassword");
      const errorEl = document.getElementById("muddhaLoginError");
      if(errorEl) errorEl.textContent = "";

      const rawId = idInput ? idInput.value.trim() : "";
      const pw = pwInput ? pwInput.value : "";

      if(!rawId || !pw){
        if(errorEl) errorEl.textContent = "아이디와 비밀번호를 모두 입력해 주세요.";
        return;
      }

      const email = muddhaIdToEmail(rawId);
      if(!email){
        if(errorEl) errorEl.textContent = "아이디 형식이 이상해요. 다시 확인해 주세요.";
        return;
      }

      try{
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password: pw
        });
        if(error){
          console.warn(error);
          if(errorEl) errorEl.textContent = "아이디 또는 비밀번호가 잘못되었습니다.";
          return;
        }
        if(data && data.session){
          const overlay = document.getElementById("muddhaLoginOverlay");
          if(overlay) overlay.style.display = "none";
          try{
            if(typeof tryAutoLoadKaitoForCurrentUser === "function"){
              tryAutoLoadKaitoForCurrentUser();
            }
            if (typeof window !== "undefined" && typeof window.muddhaProfileReload === "function") {
              window.muddhaProfileReload();
            }
          }catch(e){
            console.warn("auto KAITO after login error:", e);
          }
        }else if(errorEl){
          errorEl.textContent = "로그인 세션을 만들지 못했어요.";
        }
      }catch(e){
        console.warn("muddhaHandleLogin error:", e);
        const errorEl = document.getElementById("muddhaLoginError");
        if(errorEl) errorEl.textContent = "알 수 없는 오류가 발생했어요.";
      }
    }

    async function muddhaHandleSignup(){
      const idInput = document.getElementById("signupId");
      const pwInput = document.getElementById("signupPassword");
      const pw2Input = document.getElementById("signupPasswordConfirm");
      const nickInput = document.getElementById("signupNickname");
      const handleInput = document.getElementById("signupHandle");
      const errorEl = document.getElementById("muddhaLoginError");
      if(errorEl) errorEl.textContent = "";

      const rawId = idInput ? idInput.value.trim() : "";
      const pw = pwInput ? pwInput.value : "";
      const pw2 = pw2Input ? pw2Input.value : "";
      const nickname = nickInput ? nickInput.value.trim() : "";
      const handle = handleInput ? handleInput.value.trim() : "";

      if(!rawId || !pw || !pw2){
        if(errorEl) errorEl.textContent = "아이디, 비밀번호, 비밀번호 확인을 모두 입력해 주세요.";
        return;
      }
      if(pw.length < 8){
        if(errorEl) errorEl.textContent = "비밀번호는 최소 8자 이상이어야 합니다.";
        return;
      }
      if(pw !== pw2){
        if(errorEl) errorEl.textContent = "비밀번호가 서로 다릅니다.";
        return;
      }
      if(!handle){
        if(errorEl) errorEl.textContent = "트위터 핸들은 필수입니다.";
        return;
      }

      const email = muddhaIdToEmail(rawId);
      if(!email){
        if(errorEl) errorEl.textContent = "아이디 형식이 이상해요. 다시 확인해 주세요.";
        return;
      }

      try{
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: pw
        });
        if(error){
          console.warn(error);
          if(errorEl) errorEl.textContent = "회원가입 중 오류가 발생했어요.";
          return;
        }
        if(data && data.user){
          // profiles 테이블에 nickname / handle 저장 (있으면)
          try{
            await supabaseClient
              .from("profiles")
              .upsert({
                id: data.user.id,
                user_id: data.user.id,
                muddah_id: rawId || null,
                nickname,
                handle,
                x_handle: handle
              }, { onConflict: "id" });
          }catch(e){ console.warn("profiles upsert error:", e); }

          if(errorEl) errorEl.textContent = "회원가입 완료! 이제 로그인 탭에서 로그인해 주세요.";
        }else if(errorEl){
          errorEl.textContent = "회원가입은 되었는데 세션을 만들지 못했어요. 로그인 탭에서 다시 시도해 주세요.";
        }
      }catch(e){
        console.warn("muddhaHandleSignup error:", e);
        const errorEl = document.getElementById("muddhaLoginError");
        if(errorEl) errorEl.textContent = "알 수 없는 오류가 발생했어요.";
      }
    }

    document.addEventListener("DOMContentLoaded", async function(){
      const overlay = document.getElementById("muddhaLoginOverlay");
      const tabLogin = document.getElementById("muddhaTabLogin");
      const tabSignup = document.getElementById("muddhaTabSignup");
      const loginFields = document.getElementById("muddhaLoginFields");
      const signupFields = document.getElementById("muddhaSignupFields");
      const loginBtn = document.getElementById("muddhaLoginButton");
      const signupBtn = document.getElementById("muddhaSignupButton");
      const logoutBtn = document.querySelector(".pill-btn.secondary");


      function setMode(mode){
        const titleEl = document.getElementById("muddhaLoginTitle");
        const descEl = document.getElementById("muddhaLoginDesc");
        const errEl = document.getElementById("muddhaLoginError");
        if(errEl) errEl.textContent = "";

        if(mode === "login"){
          if(tabLogin) tabLogin.classList.add("active");
          if(tabSignup) tabSignup.classList.remove("active");
          if(loginFields) loginFields.style.display = "block";
          if(signupFields) signupFields.style.display = "none";
          if(loginBtn) loginBtn.style.display = "block";
          if(signupBtn) signupBtn.style.display = "none";
          if(titleEl) titleEl.textContent = "MUDDHA 로그인";
          if(descEl) descEl.innerHTML = "아이디와 비밀번호를 입력하면 돼요. 내부적으로 <b>@muddha-id.com</b>이 자동으로 붙습니다.";
        }else{
          if(tabSignup) tabSignup.classList.add("active");
          if(tabLogin) tabLogin.classList.remove("active");
          if(loginFields) loginFields.style.display = "none";
          if(signupFields) signupFields.style.display = "block";
          if(signupBtn) signupBtn.style.display = "block";
          if(loginBtn) loginBtn.style.display = "none";
          if(titleEl) titleEl.textContent = "MUDDHA 회원가입";
          if(descEl) descEl.innerHTML = "아이디 + 비밀번호 + 트위터 핸들을 설정하면 돼요. 아이디는 내부적으로 <b>@muddha-id.com</b> 이메일로 변환됩니다.";
        }
      }

      if(tabLogin) tabLogin.addEventListener("click", function(){ setMode("login"); });
      if(tabSignup) tabSignup.addEventListener("click", function(){ setMode("signup"); });
      if(loginBtn) loginBtn.addEventListener("click", function(e){ e.preventDefault(); muddhaHandleLogin(); });
      if(signupBtn) signupBtn.addEventListener("click", function(e){ e.preventDefault(); muddhaHandleSignup(); });
      if(logoutBtn) logoutBtn.addEventListener("click", async function(e){
        e.preventDefault();
        try{
          const { error } = await supabaseClient.auth.signOut();
          if(error){
            console.warn("logout error:", error);
          }
        }catch(err){
          console.warn("logout exception:", err);
        }
        if(overlay) overlay.style.display = "flex";
      });

      setMode("login");

      try{
        const { data, error } = await supabaseClient.auth.getSession();
        if(!error && data && data.session){
          if(overlay) overlay.style.display = "none";
          try{
            if(typeof tryAutoLoadKaitoForCurrentUser === "function"){
              tryAutoLoadKaitoForCurrentUser();
            }
            if (typeof window !== "undefined" && typeof window.muddhaProfileReload === "function") {
              window.muddhaProfileReload();
            }
          }catch(e){
            console.warn("auto KAITO after session restore error:", e);
          }
        }else{
          if(overlay) overlay.style.display = "flex";
        }
      }catch(e){
        console.warn("getSession error:", e);
        if(overlay) overlay.style.display = "flex";
      }
    });



(function () {
      const STORAGE_KEY = "muddha_yapping_planner_v1";

      function safeParse(json) {
        try {
          return JSON.parse(json);
        } catch (e) {
          console.warn("YAP planner parse error", e);
          return null;
        }
      }

      function loadPlans() {
        if (!window.localStorage) return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? safeParse(raw) : null;
        return Array.isArray(data) ? data : [];
      }

      function savePlans(list) {
        if (!window.localStorage) return;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
          console.warn("YAP planner save error", e);
        }
      }

      function todayISO() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
      }

      function toISODate(date) {
        const d = new Date(date.getTime());
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
      }

      function getWeekStart(date) {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = d.getDay(); // 0=Sun,1=Mon,...
        const diff = day === 0 ? -6 : 1 - day; // Monday as first
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
      }

      function addDays(date, offset) {
        const d = new Date(date.getTime());
        d.setDate(d.getDate() + offset);
        return d;
      }

      function weekdayLabelMonFirst(idx) {
        // idx: 0=Mon..6=Sun
        const arr = ["월", "화", "수", "목", "금", "토", "일"];
        return arr[idx] || "";
      }

      function weekdayFromDate(date) {
        // JS: 0=Sun..6=Sat -> convert to 0=Mon
        const js = date.getDay();
        const idx = (js + 6) % 7; // Sun->6, Mon->0,...
        return weekdayLabelMonFirst(idx);
      }

      function formatRangeLabel(start, end) {
        const sY = start.getFullYear();
        const sM = start.getMonth() + 1;
        const sD = start.getDate();
        const eM = end.getMonth() + 1;
        const eD = end.getDate();
        return sY + "년 " + sM + "월 " + sD + "일 ~ " + eM + "월 " + eD + "일";
      }

      function formatMonthLabel(base) {
        return base.getFullYear() + "년 " + (base.getMonth() + 1) + "월";
      }

      function importanceDotClass(plan) {
        if (plan.importance === "필수") return "core";
        if (plan.horizon === "장기") return "long";
        return "sub";
      }

      let dashboardRenderFn = null;

      // ----------------- Planner Tab -----------------
      function setupPlannerTab() {
        const root = document.getElementById("tab-planner");
        if (!root) return;

        const dateInput = document.getElementById("planDate");
        if (!dateInput) return; // nothing to do yet

        const countInput = document.getElementById("planCount");
        const titleInput = document.getElementById("planTitle");
        const typeSelect = document.getElementById("planType");
        const projectInput = document.getElementById("planProject");
        const memoInput = document.getElementById("planMemo");
        const importanceGroup = document.getElementById("planImportanceGroup");
        const horizonGroup = document.getElementById("planHorizonGroup");
        const addBtn = document.getElementById("plannerAddButton");
        const clearBtn = document.getElementById("plannerClearButton");
        const filterButtons = root.querySelectorAll(".planner-filter-btn");
        const savedSummary = document.getElementById("plannerSavedSummary");
        const savedList = document.getElementById("plannerSavedList");

        const weekGrid = document.getElementById("plannerWeekGrid");
        const weekEmpty = document.getElementById("plannerEmptyWeek");
        const monthGrid = document.getElementById("plannerMonthGrid");
        const monthEmpty = document.getElementById("plannerEmptyMonth");
        const weekView = document.getElementById("plannerWeekView");
        const monthView = document.getElementById("plannerMonthView");
        const calendarTabs = root.querySelectorAll(".planner-calendar-tab");
        const rangeLabel = document.getElementById("plannerRangeLabel");
        const navButtons = root.querySelectorAll(".planner-nav-btn");

        const today = todayISO();
        dateInput.value = today;

        const state = {
          filter: "upcoming",
          view: "week",
          weekBase: getWeekStart(new Date()),
          monthBase: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        };

        function getActiveChipValue(groupEl, fallback) {
          if (!groupEl) return fallback;
          const active = groupEl.querySelector(".planner-chip.active");
          return active ? active.getAttribute("data-value") : fallback;
        }

        function handleChipClick(ev) {
          const btn = ev.target.closest(".planner-chip");
          if (!btn) return;
          const parent = btn.parentElement;
          Array.prototype.forEach.call(parent.children, function (el) {
            el.classList.remove("active");
          });
          btn.classList.add("active");
        }

        if (importanceGroup) importanceGroup.addEventListener("click", handleChipClick);
        if (horizonGroup) horizonGroup.addEventListener("click", handleChipClick);

        function applyFilter(filter) {
          state.filter = filter;
          filterButtons.forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-filter") === filter);
          });
          renderList();
        }

        function renderList() {
          const plans = loadPlans();
          const t = todayISO();
          const upcomingCount = plans.filter(function (p) {
            return !p.done && p.date >= t;
          }).length;

          if (savedSummary) {
            savedSummary.textContent = "총 " + plans.length + "개 · 앞으로 남은 일정 " + upcomingCount + "개";
          }

          if (!savedList) return;
          savedList.innerHTML = "";

          let filtered = plans.slice();
          if (state.filter === "upcoming") {
            filtered = filtered.filter(function (p) {
              return !p.done && p.date >= t;
            });
          } else if (state.filter === "done") {
            filtered = filtered.filter(function (p) {
              return p.done;
            });
          }

          filtered.sort(function (a, b) {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (a.importance !== b.importance) {
              return a.importance === "필수" ? -1 : 1;
            }
            return (a.createdAt || "").localeCompare(b.createdAt || "");
          });

          if (!filtered.length) {
            const empty = document.createElement("div");
            empty.className = "planner-empty";
            empty.textContent = "해당 조건에 맞는 야핑 계획이 아직 없어요.";
            savedList.appendChild(empty);
            return;
          }

          filtered.forEach(function (p) {
            const item = document.createElement("div");
            item.className = "planner-saved-item" + (p.done ? " done" : "");
            item.setAttribute("data-id", p.id);

            const line1 = document.createElement("div");
            line1.className = "planner-saved-line1";

            const titleSpan = document.createElement("div");
            titleSpan.className = "planner-saved-title" + (p.done ? " done" : "");
            const dObj = new Date(p.date + "T00:00:00");
            titleSpan.textContent = weekdayFromDate(dObj) + " · " + p.title;

            const countSpan = document.createElement("div");
            countSpan.className = "planner-saved-meta";
            countSpan.textContent = (p.count || 1) + "회";

            line1.appendChild(titleSpan);
            line1.appendChild(countSpan);

            const meta = document.createElement("div");
            meta.className = "planner-saved-meta";
            const dateLabel = p.date.replace(/-/g, ". ");
            const typeLabel = p.type || "";
            const projectLabel = p.project || "";
            meta.textContent = dateLabel + " · " + typeLabel + (projectLabel ? " · " + projectLabel : "");

            const badges = document.createElement("div");
            badges.className = "planner-saved-badges";
            const b1 = document.createElement("span");
            b1.className = "planner-badge";
            b1.textContent = p.importance || "필수";
            const b2 = document.createElement("span");
            b2.className = "planner-badge";
            b2.textContent = p.horizon || "단기";
            badges.appendChild(b1);
            badges.appendChild(b2);

            const actions = document.createElement("div");
            actions.className = "planner-saved-actions";
            const doneBtn = document.createElement("button");
            doneBtn.className = "planner-mini-btn primary";
            doneBtn.setAttribute("data-action", "toggleDone");
            doneBtn.textContent = p.done ? "완료 해제" : "완료 표시";
            const delBtn = document.createElement("button");
            delBtn.className = "planner-mini-btn danger";
            delBtn.setAttribute("data-action", "delete");
            delBtn.textContent = "삭제";
            actions.appendChild(doneBtn);
            actions.appendChild(delBtn);

            item.appendChild(line1);
            item.appendChild(meta);
            if (p.memo) {
              const memo = document.createElement("div");
              memo.className = "planner-saved-meta";
              memo.textContent = p.memo;
              item.appendChild(memo);
            }
            item.appendChild(badges);
            item.appendChild(actions);

            savedList.appendChild(item);
          });
        }

        function renderCalendar() {
          const plans = loadPlans();
          renderWeek(plans);
          renderMonth(plans);
        }

        function renderWeek(plans) {
          if (!weekGrid || !weekEmpty) return;
          const start = getWeekStart(state.weekBase);
          const end = addDays(start, 6);
          if (rangeLabel && state.view === "week") {
            rangeLabel.textContent = formatRangeLabel(start, end);
          }

          const byDate = {};
          plans.forEach(function (p) {
            if (!p.date) return;
            if (!byDate[p.date]) byDate[p.date] = [];
            byDate[p.date].push(p);
          });

          weekGrid.innerHTML = "";
          let hasAny = false;

          for (let i = 0; i < 7; i++) {
            const dayDate = addDays(start, i);
            const iso = toISODate(dayDate);
            const list = byDate[iso] || [];
            if (list.length) hasAny = true;

            const cell = document.createElement("div");
            cell.className = "planner-day";

            const header = document.createElement("div");
            header.className = "planner-day-header";
            const labelEl = document.createElement("div");
            labelEl.textContent = weekdayLabelMonFirst(i) + " " + dayDate.getDate();
            const countEl = document.createElement("div");
            countEl.className = "planner-day-count";
            if (list.length) countEl.textContent = list.length + "개";
            header.appendChild(labelEl);
            header.appendChild(countEl);
            cell.appendChild(header);

            list.sort(function (a, b) {
              return a.importance === "필수" ? -1 : 1;
            });

            list.forEach(function (p) {
              const pill = document.createElement("div");
              pill.className = "planner-pill";

              const main = document.createElement("div");
              main.className = "planner-pill-main";

              const title = document.createElement("div");
              title.className = "planner-pill-title";
              const dot = document.createElement("span");
              dot.className = "planner-dot " + importanceDotClass(p);
              const text = document.createElement("span");
              text.textContent = p.title;
              title.appendChild(dot);
              title.appendChild(text);

              const count = document.createElement("div");
              count.className = "planner-pill-meta";
              count.textContent = (p.count || 1) + "회";

              main.appendChild(title);
              main.appendChild(count);

              const meta = document.createElement("div");
              meta.className = "planner-pill-meta";
              const typeLabel = p.type || "";
              const projectLabel = p.project || "";
              meta.textContent = typeLabel + (projectLabel ? " · " + projectLabel : "");

              pill.appendChild(main);
              pill.appendChild(meta);

              if (p.memo) {
                const tagline = document.createElement("div");
                tagline.className = "planner-pill-tagline";
                tagline.textContent = p.memo;
                pill.appendChild(tagline);
              }

              cell.appendChild(pill);
            });

            weekGrid.appendChild(cell);
          }

          weekEmpty.style.display = hasAny ? "none" : "block";
        }

        function renderMonth(plans) {
          if (!monthGrid || !monthEmpty) return;
          const base = state.monthBase;
          const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
          const start = getWeekStart(firstOfMonth);
          const cells = 42;

          const byDate = {};
          plans.forEach(function (p) {
            if (!p.date) return;
            if (!byDate[p.date]) byDate[p.date] = [];
            byDate[p.date].push(p);
          });

          monthGrid.innerHTML = "";
          let hasAny = false;

          for (let i = 0; i < cells; i++) {
            const dayDate = addDays(start, i);
            const iso = toISODate(dayDate);
            const list = byDate[iso] || [];
            if (list.length && dayDate.getMonth() === base.getMonth()) {
              hasAny = true;
            }

            const cell = document.createElement("div");
            cell.className = "planner-month-cell";
            if (dayDate.getMonth() !== base.getMonth()) {
              cell.classList.add("planner-month-other");
            }

            const header = document.createElement("div");
            header.className = "planner-month-day";
            const left = document.createElement("div");
            left.textContent = dayDate.getDate();
            const right = document.createElement("div");
            right.className = "planner-month-count";
            if (list.length) right.textContent = list.length + "개";
            header.appendChild(left);
            header.appendChild(right);
            cell.appendChild(header);

            list.slice(0, 3).forEach(function (p) {
              const row = document.createElement("div");
              row.className = "planner-month-item";
              row.textContent = p.title;
              cell.appendChild(row);
            });

            monthGrid.appendChild(cell);
          }

          if (monthEmpty) {
            monthEmpty.style.display = hasAny ? "none" : "block";
          }
          if (rangeLabel && state.view === "month") {
            rangeLabel.textContent = formatMonthLabel(base);
          }
        }

        function handleAdd(ev) {
          ev.preventDefault();
          const date = (dateInput.value || todayISO());
          const count = parseInt(countInput.value || "1", 10);
          const title = (titleInput.value || "").trim();
          const type = typeSelect.value;
          const project = (projectInput.value || "").trim();
          const memo = (memoInput.value || "").trim();
          const importance = getActiveChipValue(importanceGroup, "필수");
          const horizon = getActiveChipValue(horizonGroup, "단기");

          if (!title) {
            alert("야핑 주제/제목을 입력해줘!");
            titleInput.focus();
            return;
          }

          const now = new Date();
          const newPlan = {
            id: "plan_" + now.getTime() + "_" + Math.random().toString(16).slice(2, 8),
            date: date,
            count: isNaN(count) ? 1 : count,
            title: title,
            type: type,
            project: project,
            memo: memo,
            importance: importance,
            horizon: horizon,
            done: false,
            createdAt: now.toISOString()
          };

          const plans = loadPlans();
          plans.push(newPlan);
          savePlans(plans);

          renderList();
          renderCalendar();
          if (typeof dashboardRenderFn === "function") {
            dashboardRenderFn();
          }
        }

        function handleClear() {
          if (!confirm("정말 모든 야핑 계획을 삭제할까요?")) return;
          savePlans([]);
          renderList();
          renderCalendar();
          if (typeof dashboardRenderFn === "function") {
            dashboardRenderFn();
          }
        }

        if (addBtn) addBtn.addEventListener("click", handleAdd);
        if (clearBtn) clearBtn.addEventListener("click", handleClear);

        if (savedList) {
          savedList.addEventListener("click", function (ev) {
            const btn = ev.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            const item = btn.closest(".planner-saved-item");
            if (!item) return;
            const id = item.getAttribute("data-id");
            const plans = loadPlans();
            const idx = plans.findIndex(function (p) { return p.id === id; });
            if (idx === -1) return;

            if (action === "toggleDone") {
              plans[idx].done = !plans[idx].done;
            } else if (action === "delete") {
              if (!confirm("이 야핑 계획을 삭제할까요?")) return;
              plans.splice(idx, 1);
            }
            savePlans(plans);
            renderList();
            renderCalendar();
            if (typeof dashboardRenderFn === "function") {
              dashboardRenderFn();
            }
          });
        }

        calendarTabs.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const view = btn.getAttribute("data-view") || "week";
            state.view = view;
            calendarTabs.forEach(function (b) {
              b.classList.toggle("active", b === btn);
            });
            if (view === "week") {
              if (weekView) weekView.style.display = "block";
              if (monthView) monthView.style.display = "none";
              const start = getWeekStart(state.weekBase);
              const end = addDays(start, 6);
              if (rangeLabel) rangeLabel.textContent = formatRangeLabel(start, end);
            } else {
              if (weekView) weekView.style.display = "none";
              if (monthView) monthView.style.display = "block";
              if (rangeLabel) rangeLabel.textContent = formatMonthLabel(state.monthBase);
            }
          });
        });

        navButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const dir = btn.getAttribute("data-dir") === "prev" ? -1 : 1;
            if (state.view === "week") {
              state.weekBase = addDays(state.weekBase, dir * 7);
              const start = getWeekStart(state.weekBase);
              const end = addDays(start, 6);
              if (rangeLabel) rangeLabel.textContent = formatRangeLabel(start, end);
            } else {
              const mb = state.monthBase;
              state.monthBase = new Date(mb.getFullYear(), mb.getMonth() + dir, 1);
              if (rangeLabel) rangeLabel.textContent = formatMonthLabel(state.monthBase);
            }
            renderCalendar();
          });
        });

        // initial render
        applyFilter("upcoming");
        renderCalendar();
        const ws = getWeekStart(state.weekBase);
        const we = addDays(ws, 6);
        if (rangeLabel) rangeLabel.textContent = formatRangeLabel(ws, we);
      }

      // ----------------- Dashboard widget -----------------
      function setupDashboardWidget() {
        const weekGrid = document.getElementById("dashYapWeekGrid");
        const weekEmpty = document.getElementById("dashYapEmptyWeek");
        const monthGrid = document.getElementById("dashYapMonthGrid");
        const monthEmpty = document.getElementById("dashYapEmptyMonth");
        const label = document.getElementById("dashYapLabel");
        const tabs = document.querySelectorAll(".dash-yap-tab");
        const navButtons = document.querySelectorAll(".dash-yap-nav");
        const weekView = document.getElementById("dashYapWeekView");
        const monthView = document.getElementById("dashYapMonthView");

        if (!weekGrid || !label) return;

        const state = {
          view: "week",
          weekBase: getWeekStart(new Date()),
          monthBase: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        };

        function render() {
          const plans = loadPlans().filter(function (p) {
            // 위젯에는 "완료 안 된" 일정만 보여줌
            return !p.done;
          });
          if (state.view === "week") {
            renderWeek(plans);
          } else {
            renderMonth(plans);
          }
        }

        function renderWeek(plans) {
          const start = getWeekStart(state.weekBase);
          const end = addDays(start, 6);
          if (label) label.textContent = formatRangeLabel(start, end);

          const byDate = {};
          plans.forEach(function (p) {
            if (!p.date) return;
            if (!byDate[p.date]) byDate[p.date] = [];
            byDate[p.date].push(p);
          });

          weekGrid.innerHTML = "";
          let hasAny = false;

          for (let i = 0; i < 7; i++) {
            const dayDate = addDays(start, i);
            const iso = toISODate(dayDate);
            const list = byDate[iso] || [];
            if (list.length) hasAny = true;

            const cell = document.createElement("div");
            cell.className = "dash-yap-day";

            const header = document.createElement("div");
            header.className = "dash-yap-day-header";
            const labelEl = document.createElement("div");
            labelEl.textContent = weekdayLabelMonFirst(i) + " " + dayDate.getDate();
            const countEl = document.createElement("div");
            countEl.className = "dash-yap-day-count";
            if (list.length) countEl.textContent = list.length + "개";
            header.appendChild(labelEl);
            header.appendChild(countEl);
            cell.appendChild(header);

            list.sort(function (a, b) {
              return a.importance === "필수" ? -1 : 1;
            });

            list.forEach(function (p) {
              const pill = document.createElement("div");
              pill.className = "dash-yap-pill";

              const main = document.createElement("div");
              main.className = "dash-yap-pill-main";

              const title = document.createElement("div");
              title.className = "dash-yap-pill-title";
              const dot = document.createElement("span");
              dot.className = "dash-yap-dot " + importanceDotClass(p);
              const text = document.createElement("span");
              text.textContent = p.title;
              title.appendChild(dot);
              title.appendChild(text);

              const count = document.createElement("div");
              count.className = "dash-yap-pill-meta";
              count.textContent = (p.count || 1) + "회";

              main.appendChild(title);
              main.appendChild(count);

              const meta = document.createElement("div");
              meta.className = "dash-yap-pill-meta";
              const typeLabel = p.type || "";
              const projectLabel = p.project || "";
              meta.textContent = typeLabel + (projectLabel ? " · " + projectLabel : "");

              pill.appendChild(main);
              pill.appendChild(meta);

              if (p.memo) {
                const tagline = document.createElement("div");
                tagline.className = "dash-yap-tagline";
                tagline.textContent = p.memo;
                pill.appendChild(tagline);
              }

              cell.appendChild(pill);
            });

            weekGrid.appendChild(cell);
          }

          if (weekEmpty) {
            weekEmpty.style.display = hasAny ? "none" : "block";
          }
          if (weekView && monthView) {
            weekView.style.display = "block";
            monthView.style.display = "none";
          }
        }

        function renderMonth(plans) {
          const base = state.monthBase;
          if (label) label.textContent = formatMonthLabel(base);

          const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
          const start = getWeekStart(firstOfMonth);
          const cells = 42;

          const byDate = {};
          plans.forEach(function (p) {
            if (!p.date) return;
            if (!byDate[p.date]) byDate[p.date] = [];
            byDate[p.date].push(p);
          });

          monthGrid.innerHTML = "";
          let hasAny = false;

          for (let i = 0; i < cells; i++) {
            const dayDate = addDays(start, i);
            const iso = toISODate(dayDate);
            const list = byDate[iso] || [];
            if (list.length && dayDate.getMonth() === base.getMonth()) {
              hasAny = true;
            }

            const cell = document.createElement("div");
            cell.className = "dash-yap-month-cell";
            if (dayDate.getMonth() !== base.getMonth()) {
              cell.classList.add("dash-yap-month-other");
            }

            const header = document.createElement("div");
            header.className = "dash-yap-month-day";
            const left = document.createElement("div");
            left.textContent = dayDate.getDate();
            const right = document.createElement("div");
            right.className = "dash-yap-month-count";
            if (list.length) right.textContent = list.length + "개";
            header.appendChild(left);
            header.appendChild(right);
            cell.appendChild(header);

            list.slice(0, 3).forEach(function (p) {
              const row = document.createElement("div");
              row.className = "dash-yap-month-item";
              row.textContent = p.title;
              cell.appendChild(row);
            });

            monthGrid.appendChild(cell);
          }

          if (monthEmpty) {
            monthEmpty.style.display = hasAny ? "none" : "block";
          }
          if (weekView && monthView) {
            weekView.style.display = "none";
            monthView.style.display = "block";
          }
        }

        tabs.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const view = btn.getAttribute("data-view") || "week";
            state.view = view;
            tabs.forEach(function (b) {
              b.classList.toggle("active", b === btn);
            });
            render();
          });
        });

        navButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const dir = btn.getAttribute("data-dir") === "prev" ? -1 : 1;
            if (state.view === "week") {
              state.weekBase = addDays(state.weekBase, dir * 7);
            } else {
              const mb = state.monthBase;
              state.monthBase = new Date(mb.getFullYear(), mb.getMonth() + dir, 1);
            }
            render();
          });
        });

        dashboardRenderFn = render;
        render();
      }

      document.addEventListener("DOMContentLoaded", function () {
        setupPlannerTab();
        setupDashboardWidget();
      });
    })();

(function () {
      if (typeof window === "undefined") return;
      if (typeof supabaseClient === "undefined") {
        console.warn("Community tab: supabaseClient is not defined. 커뮤니티 기능이 비활성화됩니다.");
        return;
      }

      const COMMUNITY_BOARD_LABELS = {
        free: "자유게시판",
        request: "상호요청"
      };

      let communityCurrentBoard = "free";
      let communityCurrentUser = null;
      let communityProfile = null;
      let communityViewSeed = Math.floor(Math.random() * 50) + 20;
      let communityCurrentSort = "latest";

      let $badgeUser,
          $boardLabel,
          $boardCountText,
          $tbody,
          $writePanel,
          $toggleTop,
          $toggleBottom,
          $titleInput,
          $bodyInput,
          $submitBtn;

      function fmtDate(iso) {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        const y = String(d.getFullYear()).slice(-2);
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return y + "." + m + "." + dd;
      }

      async function loadCommunityUser() {
        try {
          const { data, error } = await supabaseClient.auth.getUser();
          if (error || !data || !data.user) {
            if ($badgeUser) $badgeUser.textContent = "로그인 필요 · 글쓰기는 로그인 후 가능";
            return;
          }
          communityCurrentUser = data.user;
          let badge = "로그인됨: " + (data.user.email || data.user.id);

          const { data: profile, error: profErr } = await supabaseClient
            .from("profiles")
            .select("nickname, handle, x_handle")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!profErr && profile) {
            communityProfile = profile;
            const displayName = profile.nickname || "붓다";
            const handle = profile.handle || profile.x_handle || "bud_dha__";
            badge = displayName + " (@" + handle + ")";
          }
          if ($badgeUser) $badgeUser.textContent = badge;
        } catch (e) {
          console.warn("Community tab: loadCommunityUser error", e);
          if ($badgeUser) $badgeUser.textContent = "로그인 상태 확인 실패";
        }
      }

      async function loadCommunityPosts() {
        if (!$tbody) return;
        $tbody.innerHTML = '<tr><td colspan="6" class="community-empty-row">게시글을 불러오는 중...</td></tr>';
        try {
          let query = supabaseClient
            .from("community_posts")
            .select("id, board, title, body, nickname, handle, created_at, reply_count, like_count")
            .eq("board", communityCurrentBoard)
            .limit(80);

          if (communityCurrentSort === "latest") {
            query = query.order("created_at", { ascending: false });
          } else {
            query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
          }

          const { data, error } = await query;
          if (error) {
            console.warn("Community tab: loadCommunityPosts error", error);
            $tbody.innerHTML = '<tr><td colspan="6" class="community-empty-row">community_posts 테이블이 없거나 권한 오류입니다. Supabase에서 테이블을 먼저 만들어 주세요.</td></tr>';
            if ($boardCountText) $boardCountText.textContent = "총 0개 글";
            return;
          }

          const posts = Array.isArray(data) ? data : [];
          if ($boardCountText) $boardCountText.textContent = "총 " + posts.length + "개 글";

          if (!posts.length) {
            $tbody.innerHTML = '<tr><td colspan="6" class="community-empty-row">아직 글이 없습니다. 하단 글쓰기 버튼으로 첫 글을 남겨보세요.</td></tr>';
            return;
          }

          let html = "";
          posts.forEach(function (post, idx) {
            const rowNo = posts.length - idx;
            const title = (post.title || "").trim() || "(제목 없음)";
            const nickname = (post.nickname || "").trim() || "익명";
            const handle = (post.handle || "").trim();
            const created = fmtDate(post.created_at);
            const replyCount = post.reply_count ?? 0;
            const likeCount = post.like_count ?? 0;
            const viewCount = likeCount * 2 + replyCount + communityViewSeed + idx;
            const isBest = likeCount >= 10;

            html += '<tr data-id="' + post.id + '">'
                  +   '<td class="community-col-no">' + rowNo + '</td>'
                  +   '<td class="community-col-title">'
                  +     '<div class="community-title-inner">'
                  +       (isBest ? '<span class="community-best-mark">★</span>' : '')
                  +       '<span class="community-title-text">' + title.replace(/</g, "&lt;") + '</span>'
                  +       (replyCount > 0 ? '<span class="community-reply-count">[' + replyCount + ']</span>' : '')
                  +     '</div>'
                  +   '</td>'
                  +   '<td class="community-col-writer">' + nickname.replace(/</g, "&lt;") + (handle ? " (@" + handle.replace(/</g, "&lt;") + ")" : "") + '</td>'
                  +   '<td class="community-col-date">' + created + '</td>'
                  +   '<td class="community-col-views">' + viewCount + '</td>'
                  +   '<td class="community-col-likes">' + likeCount + '</td>'
                  + '</tr>';
          });

          $tbody.innerHTML = html;
        } catch (e) {
          console.warn("Community tab: loadCommunityPosts unexpected error", e);
          $tbody.innerHTML = '<tr><td colspan="6" class="community-empty-row">게시글을 불러오는 중 알 수 없는 오류가 발생했습니다.</td></tr>';
          if ($boardCountText) $boardCountText.textContent = "총 0개 글";
        }
      }

      function toggleWritePanel() {
        if (!$writePanel) return;
        const isOpen = $writePanel.style.display === "block";
        $writePanel.style.display = isOpen ? "none" : "block";
      }

      async function handleSubmit() {
        if (!communityCurrentUser) {
          alert("먼저 로그인해 주세요. (커뮤니티 글쓰기는 로그인 후 사용 가능)");
          return;
        }
        const title = ($titleInput && $titleInput.value || "").trim();
        const body = ($bodyInput && $bodyInput.value || "").trim();
        if (!title || !body) {
          alert("제목과 내용을 모두 입력해 주세요.");
          return;
        }

        if ($submitBtn) {
          $submitBtn.disabled = true;
          $submitBtn.textContent = "작성 중...";
        }

        try {
          const nickname = (communityProfile && communityProfile.nickname) || "붓다";
          const handle = (communityProfile && (communityProfile.handle || communityProfile.x_handle)) || "bud_dha__";

          const { error } = await supabaseClient
            .from("community_posts")
            .insert({
              board: communityCurrentBoard,
              title,
              body,
              user_id: communityCurrentUser.id,
              nickname,
              handle,
              reply_count: 0,
              like_count: 0
            });

          if (error) {
            console.warn("Community tab: insert error", error);
            alert("글 작성 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
            return;
          }

          if ($titleInput) $titleInput.value = "";
          if ($bodyInput) $bodyInput.value = "";
          await loadCommunityPosts();
        } catch (e) {
          console.warn("Community tab: insert unexpected error", e);
          alert("글 작성 중 알 수 없는 오류가 발생했습니다.");
        } finally {
          if ($submitBtn) {
            $submitBtn.disabled = false;
            $submitBtn.textContent = "작성하기";
          }
        }
      }

      function initCommunityTab() {
        const root = document.getElementById("tab-community");
        if (!root) return;

        $badgeUser = document.getElementById("communityUserBadge");
        $boardLabel = document.getElementById("communityBoardLabel");
        $boardCountText = document.getElementById("communityBoardCountText");
        $tbody = document.getElementById("communityBoardBody");
        $writePanel = document.getElementById("communityWritePanel");
        $toggleTop = document.getElementById("communityWriteToggleTop");
        $toggleBottom = document.getElementById("communityWriteToggleBottom");
        $titleInput = document.getElementById("communityPostTitle");
        $bodyInput = document.getElementById("communityPostContent");
        $submitBtn = document.getElementById("communityPostSubmitBtn");

        const tabButtons = root.querySelectorAll(".community-tab-btn");
        tabButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const board = btn.getAttribute("data-board");
            if (!board || board === communityCurrentBoard) return;
            communityCurrentBoard = board;
            tabButtons.forEach(function (b) {
              b.classList.toggle("active", b.getAttribute("data-board") === board);
            });
            if ($boardLabel) {
              $boardLabel.textContent = COMMUNITY_BOARD_LABELS[board] || board;
            }
            loadCommunityPosts();
          });
        });

        const sortButtons = root.querySelectorAll(".community-sort-btn");
        sortButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            const sort = btn.getAttribute("data-sort") || "latest";
            if (sort === communityCurrentSort) return;
            communityCurrentSort = sort;
            sortButtons.forEach(function (b) {
              b.classList.toggle("active", b.getAttribute("data-sort") === sort);
            });
            loadCommunityPosts();
          });
        });

        if ($toggleTop) $toggleTop.addEventListener("click", toggleWritePanel);
        if ($toggleBottom) $toggleBottom.addEventListener("click", toggleWritePanel);
        if ($submitBtn) $submitBtn.addEventListener("click", handleSubmit);

        const sideBtn = document.querySelector('.nav-item[data-target="tab-community"]');
        if (sideBtn) {
          sideBtn.addEventListener("click", function () {
            loadCommunityPosts();
          });
        }

        loadCommunityUser();
        loadCommunityPosts();
      }

      document.addEventListener("DOMContentLoaded", initCommunityTab);
    })();

document.addEventListener("DOMContentLoaded", function () {
      var tabs = document.querySelectorAll('#tab-guide .guide-tab-btn');
      var panels = document.querySelectorAll('#tab-guide .guide-panel');
      if (!tabs.length || !panels.length) return;

      tabs.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-guide");
          tabs.forEach(function (b) { b.classList.remove("active"); });
          panels.forEach(function (p) { p.classList.remove("active"); });
          btn.classList.add("active");
          var panel = document.getElementById(target);
          if (panel) panel.classList.add("active");
        });
      });
    });

async function muddhaFetchYapsPlus() {
    const input = document.getElementById("yapsplus-handle");
    const valueEl = document.getElementById("yapsplus-value");
    const metaEl = document.getElementById("yapsplus-meta");

    if (!input || !valueEl || !metaEl) return;

    const raw = (input.value || "").trim();
    if (!raw) {
      metaEl.textContent = "핸들을 입력해 주세요.";
      return;
    }

    const cleanHandle = raw.replace(/^@+/, "");
    valueEl.textContent = "…";
    metaEl.textContent = "계정 @" + cleanHandle + "의 YAP 값을 불러오는 중입니다.";

    try {
      const resp = await fetch(
        "https://kaito-yap-proxy.wnehdrla8382.workers.dev/?username=" + encodeURIComponent(cleanHandle),
        { method: "GET" }
      );

      if (!resp.ok) {
        console.error("YAPS+ fetch error:", resp.status, resp.statusText);
        valueEl.textContent = "-";
        metaEl.textContent = "API 응답을 불러오지 못했어요.";
        return;
      }

      const text = await resp.text();
      console.log("YAPS+ raw text:", text);

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error("YAPS+ JSON parse error:", parseErr);
        valueEl.textContent = "-";
        metaEl.textContent = "JSON 파싱 오류가 발생했어요.";
        return;
      }

      console.log("YAPS+ json parsed:", json);

      let val = null;
      if (typeof json === "number") {
        val = json;
      } else if (json && typeof json.yaps_all !== "undefined") {
        val = json.yaps_all;
      } else if (json && json.data && typeof json.data.yaps_all !== "undefined") {
        val = json.data.yaps_all;
      }

      const num = Number(val);
      if (!isFinite(num)) {
        valueEl.textContent = "-";
        metaEl.textContent = "유효한 YAP 값을 찾지 못했어요.";
        return;
      }

      valueEl.textContent = num.toFixed(4);
      metaEl.textContent = "계정 @" + cleanHandle + "의 원본 YAP 값: " + String(val);
    } catch (e) {
      console.error("YAPS+ unexpected error:", e);
      valueEl.textContent = "-";
      metaEl.textContent = "오류: " + (e && e.message ? e.message : e);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("yapsplus-btn");
    const input = document.getElementById("yapsplus-handle");
    if (btn) {
      btn.addEventListener("click", function () {
        muddhaFetchYapsPlus();
      });
    }
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          muddhaFetchYapsPlus();
        }
      });
    }
  });

// ---- MOCK 데이터 (실제 이식 시 CSV 분석 결과로 대체) ----
    

    let projectPieChart = null;
    let scorePieChart = null;
    let gradePieChart = null;

    


function renderSummaryTable(summary) {
      const wrap = document.getElementById("project-summary-wrap");
      if (!wrap) return;
      if (!summary.projects.length) {
        wrap.innerHTML = '<div class="empty">CSV 분석 결과가 없습니다. (Dev: MOCK 데이터 필요)</div>';
        return;
      }
      const rowsHtml = summary.projects.map((p, idx) => {
        const rank = idx + 1;
        const topLabel = p.topPost ? "대표 트윗 보기 ↗" : "-";
        return `
          <tr>
            <td>#${rank}</td>
            <td>${p.name}</td>
            <td>${p.count}</td>
            <td>${p.avgScore.toFixed(1)}</td>
            <td>${p.avgTrimmed.toFixed(1)}</td>
            <td><span class="link-btn" data-project="${encodeURIComponent(p.name)}" data-role="top-tweet">${topLabel}</span></td>
          </tr>
        `;
      }).join("");

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th style="width:50px;">순위</th>
              <th>프로젝트</th>
              <th style="width:80px;">게시글 수</th>
              <th style="width:90px;">평균 점수</th>
              <th style="width:96px;">트림드 평균</th>
              <th style="width:110px;">대표 트윗</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll('[data-role="top-tweet"]').forEach(btn => {
        btn.addEventListener("click", () => {
          const projectName = decodeURIComponent(btn.getAttribute("data-project") || "");
          const proj = summary.projects.find(p => p.name === projectName);
          if (!proj || !proj.topPost) return;
          const url = proj.topPost.url || "#";
          if (url && url !== "#") {
            window.open(url, "_blank");
          }
        });
      });
    }

    function renderProjectSelect(summary) {
      const sel = document.getElementById("project-select");
      if (!sel) return;
      sel.innerHTML = '<option value="">프로젝트 선택</option>';
      summary.projects.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.count})`;
        sel.appendChild(opt);
      });
    }

    
    function renderDetailTable(posts, projectName) {
      const wrap = document.getElementById("project-detail-wrap");
      if (!wrap) return;
      let list = posts.filter(p => (p.project || "기타") === projectName);
      if (!list.length) {
        wrap.innerHTML = '<div class="empty">선택한 프로젝트에 해당하는 게시글이 없습니다.</div>';
        return;
      }

      // 정렬 및 필터 상태
      let sortMode = "tier";
      let gradeFilter = null;
      if (typeof window !== "undefined" && window.__projectMindshareState) {
        sortMode = window.__projectMindshareState.sortMode || "tier";
        gradeFilter = window.__projectMindshareState.gradeFilter || null;
        window.__projectMindshareState.currentProject = projectName;
      }

      // 등급 필터 적용 (S/A/B/C/D)
      if (gradeFilter) {
        list = list.filter(p => (p.tier || "C").toUpperCase() === gradeFilter);
      }

      // 정렬
      const tierRankMap = { "S": 0, "A": 1, "B": 2, "C": 3, "D": 4 };

      if (sortMode === "tier") {
        list = list.slice().sort((a, b) => {
          const ta = String(a.tier || "C").toUpperCase();
          const tb = String(b.tier || "C").toUpperCase();
          const ra = tierRankMap[ta] != null ? tierRankMap[ta] : 5;
          const rb = tierRankMap[tb] != null ? tierRankMap[tb] : 5;
          if (ra !== rb) return ra - rb;
          const sa = typeof a.score === "number" ? a.score : 0;
          const sb = typeof b.score === "number" ? b.score : 0;
          return sb - sa;
        });
      } else if (sortMode === "date") {
        // id는 csvAllPosts에서의 인덱스로 가정하여, 큰 값일수록 최신
        list = list.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
      }

      const rowsHtml = list.map((p, idx) => {
        const tier = (p.tier || "C").toUpperCase();
        const cls = "tier-badge tier-" + (["S","A","B","C"].includes(tier) ? tier : "C");
        return `
          <tr>
            <td style="width:40px;">#${idx + 1}</td>
            <td style="width:60px;"><span class="${cls}">${tier}</span></td>
            <td class="tweet-text">${p.text || ""}</td>
            <td style="width:130px;">
              <span class="metric-pill">참여 ${p.engagement ?? "-"} / 노출 ${p.impressions ?? "-"}</span>
            </td>
            <td style="width:80px;">
              <span class="metric-pill">${(p.score ?? 0).toFixed(1)}점</span>
            </td>
            <td style="width:100px;">
              <a class="link-btn" href="${p.url || "#"}" target="_blank">트윗 보기</a>
            </td>
          </tr>
        `;
      }).join("");

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>등급</th>
              <th>본문</th>
              <th>참여/노출</th>
              <th>점수</th>
              <th>링크</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    }

    function renderCharts(summary, posts) {
      const labels = summary.projects.map(p => p.name);
      const counts = summary.projects.map(p => p.count);
      const avgTrimmed = summary.projects.map(p => p.avgTrimmed.toFixed(1));

      const ctxProj = document.getElementById("project-pie");
      const ctxScore = document.getElementById("project-score-pie");
      const ctxGrade = document.getElementById("project-grade-pie");

      if (projectPieChart) projectPieChart.destroy();
      if (scorePieChart) scorePieChart.destroy();
      if (gradePieChart) gradePieChart.destroy();

      const selectEl = document.getElementById("project-select");

      function computeGradeDistForProject(projectName) {
        const gradeCount = { S: 0, A: 0, B: 0, C: 0 };
        posts.forEach(p => {
          if ((p.project || "기타") === projectName) {
            const t = (p.tier || "C").toUpperCase();
            if (gradeCount[t] != null) gradeCount[t] += 1;
          }
        });
        return gradeCount;
      }

      function selectProject(name) {
        if (!name) return;
        if (selectEl) {
          selectEl.value = name;
        }
        const gc = computeGradeDistForProject(name);
        if (gradePieChart) {
          gradePieChart.data.datasets[0].data = [gc.S, gc.A, gc.B, gc.C];
          gradePieChart.update();
        }
        renderDetailTable(posts, name);
      }

      if (ctxProj) {
        projectPieChart = new Chart(ctxProj, {
          type: "doughnut",
          data: {
            labels,
            datasets: [{
              data: counts
            }]
          },
          options: {
            plugins: {
              legend: { display: true, position: "bottom" }
            },
            cutout: "60%",
            onClick: (event, elements) => {
              if (!elements.length) return;
              const idx = elements[0].index;
              const name = labels[idx];
              selectProject(name);
            }
          }
        });
      }

      if (ctxScore) {
        scorePieChart = new Chart(ctxScore, {
          type: "doughnut",
          data: {
            labels,
            datasets: [{
              data: avgTrimmed
            }]
          },
          options: {
            plugins: {
              legend: { display: true, position: "bottom" }
            },
            cutout: "60%",
            onClick: (event, elements) => {
              if (!elements.length) return;
              const idx = elements[0].index;
              const name = labels[idx];
              selectProject(name);
            }
          }
        });
      }

      if (ctxGrade) {
        gradePieChart = new Chart(ctxGrade, {
          type: "doughnut",
          data: {
            labels: ["S", "A", "B", "C"],
            datasets: [{
              data: [0, 0, 0, 0]
            }]
          },
          options: {
            plugins: {
              legend: { display: true, position: "bottom" }
            },
            cutout: "60%"
          }
        });
      }

      if (selectEl) {
        selectEl.addEventListener("change", () => {
          const name = selectEl.value;
          if (!name) return;
          selectProject(name);
        });
      }

      const initialProject = summary.projects[0] && summary.projects[0].name;
      if (initialProject) {
        selectProject(initialProject);
      }
    }

    




function initProjectMindshareFromCsv() {
  try {
    const infoEl = document.getElementById("project-summary-sub");
    const posts = buildProjectPostsFromCsv();
    if (!posts.length) {
      if (infoEl) infoEl.textContent = "CSV 분석 결과가 없거나, 프로젝트 키워드를 찾지 못했습니다.";
      renderSummaryTable({ projects: [], gradeCountAll: { S:0,A:0,B:0,C:0 } });
      const sel = document.getElementById("project-select");
      if (sel) sel.innerHTML = '<option value="">프로젝트 없음</option>';
      const wrap = document.getElementById("project-detail-wrap");
      if (wrap) wrap.innerHTML = '<div class="empty">CSV 탭에서 먼저 데이터를 불러와 주세요.</div>';
      return;
    }

    const summary = aggregateByProject(posts);
    if (infoEl) infoEl.textContent = "현재 CSV 분석 결과와 프로젝트 키워드를 기준으로 Mindshare를 계산한 화면입니다.";

    renderSummaryTable(summary);
    renderProjectSelect(summary);
    renderCharts(summary, posts);
    const firstName = summary.projects[0] ? summary.projects[0].name : "";
    if (firstName) {
      renderDetailTable(posts, firstName);
    }

    
    if (typeof window !== "undefined") {
      window.__projectMindshareState = window.__projectMindshareState || {
        posts: posts,
        sortMode: "tier",
        gradeFilter: null,
        currentProject: null
      };
      window.__projectMindshareState.posts = posts;
      if (!window.__projectMindshareState.sortMode) {
        window.__projectMindshareState.sortMode = "tier";
      }
      window.__projectMindshareState.gradeFilter = null;
      window.__projectMindshareState.onProjectChange = function(name) {
        if (!name) return;
        window.__projectMindshareState.currentProject = name;
        renderDetailTable(posts, name);
      };
        }
  } catch (e) {
    console.warn("initProjectMindshareFromCsv error", e);
  }
}

// 사이드탭 클릭 시 자동 초기화

document.addEventListener("DOMContentLoaded", function() {
  const btn = document.querySelector('[data-target="tab-project"]');
  if (btn) {
    btn.addEventListener("click", function() {
      initProjectMindshareFromCsv();
    });
  }

  // 프로젝트별 게시글 정렬 토글
  const sortButtons = document.querySelectorAll(".project-sort-btn");
  sortButtons.forEach(function(b) {
    b.addEventListener("click", function() {
      const mode = b.getAttribute("data-sort") || "tier";
      sortButtons.forEach(btn => btn.classList.remove("active"));
      b.classList.add("active");
      if (typeof window !== "undefined" && window.__projectMindshareState) {
        window.__projectMindshareState.sortMode = mode;
        const posts = window.__projectMindshareState.posts || [];
        const current = window.__projectMindshareState.currentProject;
        if (current) {
          renderDetailTable(posts, current);
        }
      }
    });
  });

  
});

// Expose functions used by inline onclick handlers to global scope
try {
  if (typeof window !== "undefined") {
    if (typeof fetchKaitoLeaderboard === "function") {
      window.fetchKaitoLeaderboard = fetchKaitoLeaderboard;
    }
    if (typeof renderCookieLeaderboard === "function") {
      window.renderCookieLeaderboard = renderCookieLeaderboard;
    }
  }
} catch (e) {
  console.error("Error binding global functions:", e);
}