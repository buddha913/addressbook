(function () {
      var COOKIE_ZIP_URL = "cookie_all_bundle.zip";
      var COOKIE_JSON_INSIDE_ZIP = "cookie_all_bundle.json";
      var cookieCache = null;

      function normalizeHandle(raw) {
        if (!raw) return "";
        var h = String(raw).trim();
        if (!h) return "";
        if (h[0] === "@") h = h.slice(1);
        return h.toLowerCase();
      }

      // ZIP 안에 있는 cookie_all_bundle.json을 읽어서 파싱하는 헬퍼
      function loadCookieBundleFromZip() {
        return fetch(COOKIE_ZIP_URL)
          .then(function (res) {
            if (!res.ok) {
              throw new Error("ZIP load failed: " + res.status);
            }
            return res.arrayBuffer();
          })
          .then(function (buffer) {
            return JSZip.loadAsync(buffer);
          })
          .then(function (zip) {
            var jsonFile = zip.file(COOKIE_JSON_INSIDE_ZIP);
            if (!jsonFile) {
              throw new Error("JSON file not found inside ZIP: " + COOKIE_JSON_INSIDE_ZIP);
            }
            return jsonFile.async("string");
          })
          .then(function (text) {
            return JSON.parse(text);
          });
      }

      function normalizeCookieBundleData(raw) {
        if (!raw || typeof raw !== "object") return raw;

        // 새 포맷: { meta: ..., data: { project: { lang: { periodKey: {snaps,cSnaps} } } } }
        if (raw.data && !raw.result) {
          var converted = {};
          var data = raw.data || {};

          Object.keys(data).forEach(function (project) {
            var langs = data[project] || {};
            Object.keys(langs).forEach(function (lang) {
              var periods = langs[lang] || {};
              Object.keys(periods).forEach(function (periodKey) {
                var entry = periods[periodKey] || {};
                var snaps = entry.snaps || [];
                var cSnaps = entry.cSnaps || [];

                var fileKey = project + "_" + (lang || "global") + "_" + periodKey;
                converted[fileKey] = {
                  result: {
                    data: {
                      json: {
                        snaps: snaps,
                        cSnaps: cSnaps
                      }
                    }
                  }
                };
              });
            });
          });

          return converted;
        }

        return raw;
      }

      function ensureLoadedCookieData(callback) {
        if (cookieCache) {
          callback(cookieCache);
          return;
        }
        loadCookieBundleFromZip()
          .then(function (data) {
            cookieCache = normalizeCookieBundleData(data);
            callback(cookieCache);
          })
          .catch(function (err) {
            console.error("Cookie JSON load error:", err);
            var cards = document.getElementById("cookie-project-cards");
            var tbody = document.getElementById("cookie-raw-tbody");
            if (cards) {
              cards.innerHTML = '<div class="cookie-empty">cookie_all_bundle.json을 불러오지 못했어요. 파일이 같은 폴더에 있는지 확인해줘.</div>';
            }
            if (tbody) {
              tbody.innerHTML = '<tr><td colspan="6" class="cookie-empty">cookie_all_bundle.json을 불러오지 못했어요.</td></tr>';
            }
          });
      }

      
      var COOKIE_PROJECT_LOGOS = {
        veera: "https://pbs.twimg.com/profile_images/1990352139168923648/PfeXQsSl_400x400.jpg",
        spaace: "https://pbs.twimg.com/profile_images/1651202265405898753/6PanR3uY_400x400.jpg",
        superform: "https://pbs.twimg.com/profile_images/1937588443166416896/4S5X6QSi_400x400.png",
        glint: "https://pbs.twimg.com/profile_images/1825445059375816705/th4KzmWL_400x400.jpg",
        "glint-analytics": "https://pbs.twimg.com/profile_images/1825445059375816705/th4KzmWL_400x400.jpg",
        solv: "https://pbs.twimg.com/profile_images/1971489442235092992/njLUqgMN_400x400.jpg",
        "solv-protocol": "https://pbs.twimg.com/profile_images/1971489442235092992/njLUqgMN_400x400.jpg",
        pacifica: "https://pbs.twimg.com/profile_images/1911022804159389696/THxMFj50_400x400.jpg",
        layerbank: "https://pbs.twimg.com/profile_images/1874059175967547396/p25s8fYo_400x400.jpg",
        tria: "https://pbs.twimg.com/profile_images/1947271337057079296/_smOX_4e_400x400.jpg",
        rayls: "https://pbs.twimg.com/profile_images/1787938574702116864/W_-vmST3_400x400.png",
        almanak: "https://pbs.twimg.com/profile_images/1933390399005208578/tBlaw9Jj_400x400.png",
        ten: "https://pbs.twimg.com/profile_images/1948670923596234752/CjzIhnby_400x400.jpg",
        vooi: "https://pbs.twimg.com/profile_images/1938271243876155393/fXAC9P_h_400x400.jpg"
      };

      function projectLogo(project) {
        if (!project) return null;
        var key = String(project).toLowerCase();
        var url = COOKIE_PROJECT_LOGOS[key];
        if (url) return { url: url };
        return null;
      }

      function pickBestByPeriod(entries) {
        var periods = ["7d", "14d", "30d", "total"];
        var result = {
          mindshare: { "7d": null, "14d": null, "30d": null, "total": null },
          capital:   { "7d": null, "14d": null, "30d": null, "total": null }
        };
        entries.forEach(function (row) {
          var type = (row.type || "").toLowerCase(); // mindshare / capital
          var period = (row.period || "").toLowerCase(); // 7d / 14d / 30d / total
          if (periods.indexOf(period) === -1) return;
          var bucket = (type.indexOf("cap") !== -1) ? result.capital : result.mindshare;
          var current = bucket[period];
          if (!current || (row.rank != null && row.rank < current.rank)) {
            bucket[period] = row;
          }
        });
        return result;
      }

      function safePercent(val) {
        if (val == null || val === "" || isNaN(Number(val))) return "-";
        var num = Number(val);
        return num.toFixed(2) + "%";
      }

      
      function buildCookieRows(allData) {
        // allData is an object whose keys are filenames like
        // "vooi_global_Total_2025-12-02-03-20-10.json"
        // Each value has result.data.json.snaps / cSnaps arrays.
        var rows = [];
        if (!allData || typeof allData !== "object") return rows;

        Object.keys(allData).forEach(function (fileKey) {
          var entry = allData[fileKey];
          if (!entry || !entry.result || !entry.result.data || !entry.result.data.json) return;
          var json = entry.result.data.json || {};
          var snaps = json.snaps || [];
          var cSnaps = json.cSnaps || [];

          // Parse project / period from filename
          var name = String(fileKey).replace(/\.json$/i, "");
          var lowerName = name.toLowerCase();
          var parts = name.split("_");
          var project = parts[0] || "Unknown";

          var period = "TOTAL";
          if (lowerName.indexOf("7daysago") !== -1) {
            period = "7D";
          } else if (lowerName.indexOf("14daysago") !== -1) {
            period = "14D";
          } else if (lowerName.indexOf("30daysago") !== -1) {
            period = "30D";
          } else if (lowerName.indexOf("total") !== -1) {
            period = "TOTAL";
          }

          // Helper to push a record
          function pushRow(base, kind) {
            if (!base) return;
            var handle = base.username || base.handle || base.account || "";
            var lang = base.primaryLanguage || base.lang || base.language || "";
            var rank = null;
            var percent = null;

            if (kind === "Mindshare") {
              rank = base.snapsPercentTotalRank != null ? base.snapsPercentTotalRank : base.snapsRank;
              percent = base.snapsPercentTotal != null ? base.snapsPercentTotal : base.snapsPercent;
            } else {
              rank = base.cSnapsPercentTotalRank != null ? base.cSnapsPercentTotalRank : base.cSnapsRank;
              percent = base.cSnapsPercentTotal != null ? base.cSnapsPercentTotal : base.cSnapsPercent;
            }

            rows.push({
              project: project,
              type: kind,
              period: period,
              rank: rank,
              percent: percent,
              lang: lang,
              handle: handle
            });
          }

          snaps.forEach(function (s) { pushRow(s, "Mindshare"); });
          cSnaps.forEach(function (c) { pushRow(c, "Capital"); });
        });

        return rows;
      }

      function fillMatrixRow(container, label, set) {
        var title = document.createElement("div");
        title.className = "cookie-matrix-title";
        title.textContent = label;

        var row = document.createElement("div");
        row.className = "cookie-matrix-row";

        ["7d", "14d", "30d", "total"].forEach(function (p) {
          var cell = document.createElement("div");
          cell.className = "cookie-matrix-cell";
          var rowData = set[p];
          var rankText = "-";
          var pctText = "-";
          if (rowData) {
            if (rowData.rank != null) rankText = "#" + rowData.rank;
            if (rowData.percent != null) pctText = safePercent(rowData.percent);
          }
          var labelEl = document.createElement("div");
          labelEl.className = "metric-label";
          labelEl.textContent = p.toUpperCase();
          var valEl = document.createElement("div");
          valEl.className = "metric-value";
          valEl.textContent = rankText + " · " + pctText;
          cell.appendChild(labelEl);
          cell.appendChild(valEl);
          row.appendChild(cell);
        });

        container.appendChild(title);
        container.appendChild(row);
      }

      function renderCookieLeaderboard() {
        var input = document.getElementById("cookie-handle-input");
        if (!input) return;
        var norm = normalizeHandle(input.value);
        var cardsContainer = document.getElementById("cookie-project-cards");
        var tbody = document.getElementById("cookie-raw-tbody");
        if (!norm) {
          if (cardsContainer) {
            cardsContainer.innerHTML = '<div class="cookie-empty">먼저 위에서 @핸들을 입력하고 <b>검색</b>을 눌러줘.</div>';
          }
          if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="cookie-empty">핸들을 입력하면, 여기 Cookie 세부 랭킹이 나와요.</td></tr>';
          }
          return;
        }

        ensureLoadedCookieData(function (allData) {
          var rows = buildCookieRows(allData);
          var filtered = rows.filter(function (row) {
            var h = normalizeHandle(row.handle || row.account || row.owner);
            return h === norm;
          });

          if (!cardsContainer || !tbody) return;

          if (!filtered.length) {
            cardsContainer.innerHTML = '<div class="cookie-empty">@' + norm + ' 로 검색된 Cookie 랭킹이 없어요.</div>';
            tbody.innerHTML =
              '<tr><td colspan="6" class="cookie-empty">@' + norm + ' 로 검색된 세부 랭킹이 없어요.</td></tr>';
            return;
          }

          // 프로젝트별로 묶기
          var byProject = {};
          filtered.forEach(function (row) {
            var proj = row.project || row.token || row.symbol || "Unknown";
            if (!byProject[proj]) byProject[proj] = [];
            byProject[proj].push(row);
          });

          // 카드 렌더
          cardsContainer.innerHTML = "";
          Object.keys(byProject).forEach(function (proj) {
            var entries = byProject[proj];
            var best = pickBestByPeriod(entries);
            var first = entries[0] || {};
            // Cookie JSON 안에 있는 profileImageUrl 우선 사용, 없으면 프로젝트 맵 fallback
            var avatarUrl = null;
            for (var i = 0; i < entries.length; i++) {
              if (entries[i] && entries[i].profileImageUrl) {
                avatarUrl = entries[i].profileImageUrl;
                break;
              }
            }
            var logoMeta = projectLogo(proj);

            var card = document.createElement("div");
            card.className = "cookie-card";

            var header = document.createElement("div");
            header.className = "cookie-card-header";

            var logoBox = document.createElement("div");
            logoBox.className = "cookie-project-logo";
            var logoUrl = (logoMeta && logoMeta.url) ? logoMeta.url : avatarUrl;
            if (logoUrl) {
              var img = document.createElement("img");
              img.src = logoUrl;
              img.alt = proj;
              logoBox.appendChild(img);
            } else {
              logoBox.textContent = proj.charAt(0).toUpperCase();
            }

            var titleBox = document.createElement("div");
            var tMain = document.createElement("div");
            tMain.className = "cookie-card-title-main";
            tMain.textContent = proj;
            var tSub = document.createElement("div");
            tSub.className = "cookie-card-title-sub";
            var lang = first.lang || first.language || "";
            tSub.textContent = "@" + norm + (lang ? " · " + lang : "");
            titleBox.appendChild(tMain);
            titleBox.appendChild(tSub);

            header.appendChild(logoBox);
            header.appendChild(titleBox);
            card.appendChild(header);

            var matrix = document.createElement("div");
            matrix.className = "cookie-matrix";
            fillMatrixRow(matrix, "Mindshare", best.mindshare);
            fillMatrixRow(matrix, "Capital", best.capital);
            card.appendChild(matrix);

            var footer = document.createElement("div");
            footer.className = "cookie-matrix-footer";
            footer.textContent = "엔트리 수: " + entries.length;
            card.appendChild(footer);

            cardsContainer.appendChild(card);
          });

          // 테이블 렌더
          var rowsHtml = filtered
            .sort(function (a, b) {
              var pa = String(a.period || "").toLowerCase();
              var pb = String(b.period || "").toLowerCase();
              if (pa === pb) {
                return (a.rank || 999999) - (b.rank || 999999);
              }
              return pa < pb ? -1 : 1;
            })
            .map(function (row) {
              var proj = row.project || row.token || row.symbol || "Unknown";
              var type = row.type || row.category || "";
              var period = row.period || row.window || "";
              var rank = (row.rank != null) ? row.rank : "-";
              var pct = safePercent(row.percent != null ? row.percent : row.share);
              var lang = row.lang || row.language || "";
              return (
                "<tr>" +
                  "<td>" + proj + "</td>" +
                  "<td>" + type + "</td>" +
                  "<td>" + String(period).toUpperCase() + "</td>" +
                  "<td>" + rank + "</td>" +
                  "<td>" + pct + "</td>" +
                  "<td>" + lang + "</td>" +
                "</tr>"
              );
            })
            .join("");
          tbody.innerHTML = rowsHtml || '<tr><td colspan="6" class="cookie-empty">표시할 랭킹이 없습니다.</td></tr>';
        });
      }


      // === Dashboard Cookie slider ===
      function renderDashboardCookieForHandle(handleRaw) {
        var wrap = document.getElementById("dashboard-cookie-slider");
        if (!wrap) return;

        var norm = normalizeHandle(handleRaw);
        if (!norm) {
          wrap.innerHTML = '<div class="cookie-empty">로그인 후 Cookie 랭킹이 연동되면, 여기에서 프로젝트별 카드를 볼 수 있어.</div>';
          return;
        }

        ensureLoadedCookieData(function (allData) {
          var rows = buildCookieRows(allData);
          var filtered = rows.filter(function (row) {
            var h = normalizeHandle(row.handle || row.account || row.owner);
            return h === norm;
          });

          if (!filtered.length) {
            wrap.innerHTML = '<div class="cookie-empty">@' + norm + ' 로 검색된 Cookie 랭킹이 없어요.</div>';
            return;
          }

          var byProject = {};
          filtered.forEach(function (row) {
            var proj = row.project || row.token || row.symbol || "Unknown";
            if (!byProject[proj]) byProject[proj] = [];
            byProject[proj].push(row);
          });

          var sliderWrap = document.createElement("div");
          sliderWrap.className = "cookie-slider-wrap";
          var track = document.createElement("div");
          track.className = "cookie-slider-track";

          Object.keys(byProject).forEach(function (proj) {
            var entries = byProject[proj];
            var best = pickBestByPeriod(entries);
            var first = entries[0] || {};

            var avatarUrl = null;
            for (var i = 0; i < entries.length; i++) {
              if (entries[i] && entries[i].profileImageUrl) {
                avatarUrl = entries[i].profileImageUrl;
                break;
              }
            }
            var logoMeta = projectLogo(proj);

            var card = document.createElement("div");
            card.className = "cookie-card";

            var header = document.createElement("div");
            header.className = "cookie-card-header";

            var logoBox = document.createElement("div");
            logoBox.className = "cookie-project-logo";
            var logoUrl = (logoMeta && logoMeta.url) ? logoMeta.url : avatarUrl;
            if (logoUrl) {
              var img = document.createElement("img");
              img.src = logoUrl;
              img.alt = proj;
              logoBox.appendChild(img);
            } else {
              logoBox.textContent = proj.charAt(0).toUpperCase();
            }

            var titleBox = document.createElement("div");
            var tMain = document.createElement("div");
            tMain.className = "cookie-card-title-main";
            tMain.textContent = proj;
            var tSub = document.createElement("div");
            tSub.className = "cookie-card-title-sub";
            var lang = first.lang || first.language || "";
            tSub.textContent = "@" + norm + (lang ? " · " + lang : "");
            titleBox.appendChild(tMain);
            titleBox.appendChild(tSub);

            header.appendChild(logoBox);
            header.appendChild(titleBox);
            card.appendChild(header);

            var matrix = document.createElement("div");
            matrix.className = "cookie-matrix";
            fillMatrixRow(matrix, "Mindshare", best.mindshare);
            fillMatrixRow(matrix, "Capital", best.capital);
            card.appendChild(matrix);

            var footer = document.createElement("div");
            footer.className = "cookie-matrix-footer";
            footer.textContent = "엔트리 수: " + entries.length;
            card.appendChild(footer);

            track.appendChild(card);
          });

          sliderWrap.appendChild(track);
          wrap.innerHTML = "";
          wrap.appendChild(sliderWrap);
        });
      }

      async function refreshDashboardCookieForCurrentUser() {
        var wrap = document.getElementById("dashboard-cookie-slider");
        if (!wrap) return;

        try {
          if (typeof window === "undefined" || !window.supabaseClient) {
            wrap.innerHTML = '<div class="cookie-empty">로그인 또는 Cookie 설정을 찾을 수 없어요.</div>';
            return;
          }

          var result = await window.supabaseClient.auth.getUser();
          var userData = result.data;
          var userError = result.error;
          if (userError || !userData || !userData.user) {
            wrap.innerHTML = '<div class="cookie-empty">로그인 정보를 불러오지 못했어요.</div>';
            return;
          }

          var userId = userData.user.id;
          var profRes = await window.supabaseClient
            .from("profiles")
            .select("handle, x_handle")
            .eq("user_id", userId)
            .maybeSingle();

          var profile = profRes.data;
          if (!profile) {
            wrap.innerHTML = '<div class="cookie-empty">프로필에 연결된 X 핸들이 없어요.</div>';
            return;
          }

          var handle = (profile.handle || profile.x_handle || "").trim();
          if (!handle) {
            wrap.innerHTML = '<div class="cookie-empty">프로필에 연결된 X 핸들이 없어요.</div>';
            return;
          }

          renderDashboardCookieForHandle(handle);
        } catch (e) {
          console.warn("refreshDashboardCookieForCurrentUser error:", e);
          wrap.innerHTML = '<div class="cookie-empty">Cookie 대시보드 데이터를 불러오는 중 오류가 발생했어.</div>';
        }
      }

      if (typeof window !== "undefined") {
        window.refreshDashboardCookieForCurrentUser = refreshDashboardCookieForCurrentUser;
      }

      document.addEventListener("DOMContentLoaded", function () {
        try {
          if (document.getElementById("dashboard-cookie-slider")) {
            refreshDashboardCookieForCurrentUser();
          }
        } catch (e) {
          console.warn("auto Cookie dashboard load error:", e);
        }
      });

      window.renderCookieLeaderboard = renderCookieLeaderboard;

      document.addEventListener("DOMContentLoaded", function () {
        var input = document.getElementById("cookie-handle-input");
        if (input) {
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
              renderCookieLeaderboard();
            }
          });
        }
      });
    })();