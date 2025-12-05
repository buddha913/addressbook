// ===== Kaito / InfoFi 리더보드 (Supabase Edge Function) =====
  const KAITOPROXY_URL = "https://kaito-proxy.wnehdrla8382.workers.dev/kaito";

  const KAITO_TOPIC_TWITTER_HANDLES = {
  "Aptos": "Aptos",
  "Beldex": "BeldexCoin",
  "Berachain": "berachain",
  "Camp Network": "campnetworkxyz",
  "Ethereum": "ethereum",
  "Fogo": "fogo",
  "Injective": "injective",
  "Irys": "irys_xyz",
  "Kaia": "KaiaChain",
  "MANTRA": "MANTRA_Chain",
  "Mavryk": "MavrykNetwork",
  "Mitosis": "MitosisOrg",
  "Monad": "monad",
  "Movement": "movementlabsxyz",
  "Near": "NEARProtocol",
  "PEAQ": "peaq",
  "Polkadot": "Polkadot",
  "Sei": "SeiNetwork",
  "Somnia": "Somnia_Network",
  "Sonic": "SonicLabs",
  "S": "SonicLabs",
  "Story": "StoryProtocol",
  "XION": "burnt_xion",
  "CreatorBid": "CreatorBid",
  "INFINIT": "Infinit_Labs",
  "Newton": "MagicNewton",
  "Surf": "SurfAI",
  "Symphony": "symphonyio",
  "Talus": "Talus_Labs",
  "Theoriq": "TheoriqAI",
  "Virtuals Protocol": "virtuals_io",
  "Warden Protocol": "wardenprotocol",
  "Wayfinder": "AIWayfinder",
  "ANIME": "animecoin",
  "Boop": "boopdotfun",
  "Doodles": "doodles",
  "MemeX": "MemeX_MRC20",
  "Moonbirds": "moonbirds",
  "PENGU": "pudgypenguins",
  "Corn": "use_corn",
  "GOAT Network": "GOATRollup",
  "Lombard": "Lombard_Finance",
  "Portal to BTC": "PortaltoBitcoin",
  "SatLayer": "satlayer",
  "Openmind": "openmind_agi",
  "Arbitrum": "arbitrum",
  "Katana": "katana",
  "Mantle": "0xMantle",
  "MegaETH": "megaeth",
  "Polygon": "0xPolygon",
  "SOON": "soon_svm",
  "Falcon Finance": "FalconStable",
  "Frax": "fraxfinance",
  "Huma": "humafinance",
  "MoreMarkets": "moremarketsxyz",
  "Multipli": "multiplifi",
  "Noble": "noble_xyz",
  "Orderly": "OrderlyNetwork",
  "Pyth": "PythNetwork",
  "Soul Protocol": "0xSoulProtocol",
  "STBL": "stbl_official",
  "Turtle Club": "turtleclubhouse",
  "Walrus": "WalrusProtocol",
  "Boundless": "boundless_xyz",
  "Brevis": "brevis_zk",
  "Cysic": "cysic_xyz",
  "Miden": "0xMiden",
  "Starknet": "Starknet",
  "Succinct": "SuccinctLabs",
  "Zcash": "Zcash",
  "zkPass": "zkPass",
  "Anoma": "anoma",
  "Bless": "theblessnetwork",
  "Bybit TradFi": "Bybit_Official",
  "Humanity Protocol": "Humanityprot",
  "Integra": "integra_layer",
  "Multibank": "multibank_io",
  "Thrive Protocol": "thriveprotocol",
  "ApeX": "OfficialApeXdex",
  "Bluefin": "bluefinapp",
  "dYdX": "dYdX",
  "Flipster": "flipster_io",
  "MemeMax": "MemeMax_Fi",
  "Momentum": "MMTFinance",
  "PARADEX": "paradex",
  "Kaito": "KaitoAI",
  "OG": "0G_labs",
  "Allora": "AlloraNetwork",
  "Billions Network": "billions_ntwk",
  "Edgen": "EdgenTech",
  "EverlynAI": "everlyn_ai",
  "IQ": "IQAIcom",
  "Kindred": "Kindred_AI",
  "Mira Network": "miranetwork",
  "Novastro": "Novastro_xyz",
  "NYT": "Novastro_xyz",
  "Noya.ai": "NetworkNoya",
  "OpenLedger": "OpenledgerHQ",
  "PiP World": "pip_world",
  "PlayAI": "playAInetwork",
  "Sapien": "JoinSapien",
  "Sentient": "SentientAGI",
  "UXLINK": "UXLINKofficial",
  "Tria": "useTria",
  "Anichess": "AnichessGame",
  "Bitdealer": "bitdealernet",
  "Defi App": "defiapp",
  "Hana": "HanaNetwork",
  "InfineX": "infinex",
  "Lumiterra": "LumiterraGame",
  "MapleStory Universe": "MaplestoryU",
  "Metawin": "MetaWin",
  "Parti": "jointheparti",
  "Puffpaw": "puffpaw",
  "Rainbow": "rainbowdotme",
  "Sidekick": "Sidekick_Labs",
  "SIXR Cricket": "SIXR_cricket",
  "Sophon": "Sophon",
  "Vultisig": "vultisig",
  "YEET": "yeet",
  "Caldera": "Calderaxyz",
  "Initia": "initia",
  "Skate": "skate_chain",
  "Union": "union_build",
  "KAIO": "KAIO_xyz",
  "Theo": "Theo_Network",
  "THEOTHEO": "Theo_Network"
};

  async function fetchKaitoLeaderboard() {
    const input = document.getElementById("kaito-handle-input");
    const resultDiv = document.getElementById("kaito-result");

    if (!input || !resultDiv) {
      alert("KAITO 리더보드 입력 영역을 찾을 수 없습니다.");
      return;
    }

    let handle = (input.value || "").trim();
    if (!handle) {
      resultDiv.innerHTML = '<div class="kaito-empty">먼저 @핸들을 입력해 주세요</div>';
      return;
    }
    if (handle.startsWith("@")) {
      handle = handle.slice(1);
    }

    resultDiv.innerHTML = '<div class="kaito-empty">곰투(Kaito)에서 데이터를 불러오는 중...</div>';

    try {
      const resp = await fetch(
        KAITOPROXY_URL + "?username=" + encodeURIComponent(handle),
        { method: "GET" }
      );

      if (!resp.ok) {
        resultDiv.innerHTML = '<div class="kaito-empty">API 응답 오류: ' + resp.status + '</div>';
        return;
      }

      const json = await resp.json();
      console.log("Kaito summary raw:", json);

      const rawList = json && Array.isArray(json.data) ? json.data : [];
      if (!rawList.length) {
        resultDiv.innerHTML = '<div class="kaito-empty">리더보드 데이터를 찾지 못했어.</div>';
        return;
      }

      const byTopic = {};
      rawList.forEach(item => {
        const topic = item.topic_id || item.topic || "UNKNOWN";
        if (!byTopic[topic]) byTopic[topic] = [];
        byTopic[topic].push(item);
      });

      const topicNames = Object.keys(byTopic);
      if (!topicNames.length) {
        resultDiv.innerHTML = '<div class="kaito-empty">7D / 30D / 3M 데이터가 없습니다.</div>';
        return;
      }

      function findHandleForTopic(topic) {
        const t = (topic || "").toLowerCase();
        for (const key in KAITO_TOPIC_TWITTER_HANDLES) {
          if (key.toLowerCase() === t) return KAITO_TOPIC_TWITTER_HANDLES[key];
        }
        return "";
      }

      const durationOrder = ["7D", "30D", "3M"];
      function durationIndex(d) {
        const i = durationOrder.indexOf(d);
        return i === -1 ? 999 : i;
      }
      function rankValue(r) {
        if (typeof r === "number") return r;
        const n = parseInt(r, 10);
        return isNaN(n) ? 999999 : n;
      }

      const PROJECT_DISPLAY_NAME_OVERRIDES = {
        "S": "Sonic",
        "THEOTHEO": "Theo",
        "NYT": "Novastro"
      };

      const cardsHtml = topicNames.map(topic => {
        const displayTopic = PROJECT_DISPLAY_NAME_OVERRIDES[topic] || topic;
        const rows = byTopic[topic].slice().sort((a, b) => {
          const d = durationIndex(a.duration) - durationIndex(b.duration);
          if (d !== 0) return d;
          return rankValue(a.rank) - rankValue(b.rank);
        });

        const topicHandle = findHandleForTopic(topic);
        let logoUrl = "";
        if (topicHandle) {
          logoUrl = "https://unavatar.io/twitter/" + encodeURIComponent(topicHandle);
        }
        const initial = (topic || "?").charAt(0).toUpperCase();
        const logoHtml = logoUrl
          ? '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#020617;margin-right:10px;overflow:hidden;">'
              + '<img src="' + logoUrl + '" alt="' + displayTopic + ' logo" style="width:100%;height:100%;object-fit:cover;">'
            + '</div>'
          : '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#020617;margin-right:10px;color:#e5e7eb;font-size:14px;font-weight:700;">'
              + initial +
            '</div>';

        const rowsHtml = rows.map(item => {
          const dur = item.duration || "-";
          const rank = (item.rank ?? "-");
          const rawTier = item.tier || "-";
          const tierLower = String(rawTier || "").toLowerCase();
          const tier =
            tierLower === "tier2" ? "Wider Community" :
            tierLower === "tier1" ? "Creator" :
            rawTier;
          const mindshare = (item.mindshare ?? "-");
          return `
            <tr>
              <td style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,0.7);text-align:center;">${dur}</td>
              <td style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,0.7);text-align:center;">#${rank}</td>
              <td style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,0.7);text-align:center;">${tier}</td>
              <td style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,0.7);text-align:right;">${mindshare}</td>
            </tr>
          `;
        }).join("");

        return `
          <div style="
            margin-top:10px;
            margin-bottom:10px;
            border-radius:18px;
            border:1px solid rgba(129, 140, 248, 0.9);
            background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.98));
            padding:14px 14px 12px;
            box-shadow:0 18px 35px rgba(15,23,42,0.9);
          ">
            <div style="
              font-size:13px;
              line-height:1.6;
              color:#e5e7eb;
            ">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <div style="display:flex;align-items:center;">
                  ${logoHtml}
                  <div>
                    <div style="font-weight:700;font-size:13px;">${displayTopic}</div>
                    <div style="font-size:12px;opacity:0.8;">@${handle}</div>
                  </div>
                </div>
              </div>
              <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(55,65,81,0.9);">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                  <thead>
                    <tr style="background:rgba(31,41,55,0.95);">
                      <th style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,1);text-align:center;">기간</th>
                      <th style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,1);text-align:center;">Rank</th>
                      <th style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,1);text-align:center;">Tier</th>
                      <th style="padding:6px 8px;border-bottom:1px solid rgba(55,65,81,1);text-align:right;">Mindshare</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }).join("");

      resultDiv.innerHTML = cardsHtml;
    } catch (err) {
      console.error("fetchKaitoLeaderboard error:", err);
      const msg = (err && err.message) ? err.message : err;
      resultDiv.innerHTML = '<div class="kaito-empty">데이터 불러오기 실패: ' + msg + '</div>';
    }
  }

// 대시보드용 KAITO Tier1(크리에이터) 슬라이더 렌더링
  console.log('KAITO dashboard auto script loaded');
  function renderKaitoDashboardSlider(rawList, handle) {
    try {
      const wrap = document.getElementById("kaito-dashboard-slider");
      if (!wrap) return;

      if (!rawList || !rawList.length) {
        wrap.innerHTML =
          '<div class="kaito-slider-empty">KAITO 데이터가 없어서 크리에이터 랭킹을 만들 수 없어.</div>';
        return;
      }

      // 모든 티어 포함: 주어진 rawList 전체 사용
      const allRows = rawList.slice();

      if (!allRows.length) {
        wrap.innerHTML =
          '<div class="kaito-slider-empty">이 계정은 아직 KAITO 랭킹이 없어.</div>';
        return;
      }

      // 토픽별로 대표 행 1개씩만 선택 (랭킹, 기간 우선순위 기준)
      const byTopic = {};
      allRows.forEach(function (item) {
        const topic = item.topic_id || item.topic || "UNKNOWN";
        if (!byTopic[topic]) byTopic[topic] = [];
        byTopic[topic].push(item);
      });

      const durationOrder = ["7D", "30D", "3M"];
      function durationIndex(d) {
        const i = durationOrder.indexOf(d);
        return i === -1 ? 999 : i;
      }
      function rankValue(r) {
        if (typeof r === "number") return r;
        const n = parseInt(r, 10);
        return isNaN(n) ? 999999 : n;
      }

      const topics = Object.keys(byTopic);
      const cards = topics.map(function (topic) {
        const rows = byTopic[topic].slice().sort(function (a, b) {
          const d = durationIndex(a.duration) - durationIndex(b.duration);
          if (d !== 0) return d;
          return rankValue(a.rank) - rankValue(b.rank);
        });
        const best = rows[0];

        // 프로젝트 이름
        const projectName = best.topic || best.topic_id || topic;
        const cleanHandle = (handle || "").replace(/^@/, "");

        // 기간별(7D / 30D / 3M)로 가장 좋은 랭킹 하나씩만 뽑기
        const durationOrder = ["7D", "30D", "3M"];
        const perDuration = {};
        rows.forEach(function (row) {
          const d = row.duration || "-";
          if (!perDuration[d] || rankValue(row.rank) < rankValue(perDuration[d].rank)) {
            perDuration[d] = row;
          }
        });

        function pickPrimaryRow() {
          for (let i = 0; i < durationOrder.length; i++) {
            const d = durationOrder[i];
            if (perDuration[d]) return perDuration[d];
          }
          return best;
        }

        const primary = pickPrimaryRow();
        const primaryRank = primary && primary.rank != null ? primary.rank : "-";

        const durationRowsHtml = durationOrder
          .map(function (d) {
            const row = perDuration[d];
            if (!row) return "";
            const label = row.duration || d;
            const rank = row.rank != null ? row.rank : "-";
            const ms = row.mindshare != null ? row.mindshare : "-";
            return (
              '<div class="kaito-duration-row">' +
                '<span class="kaito-duration-label">' + label + '</span>' +
                '<span class="kaito-duration-rank">#' + rank + '</span>' +
                '<span class="kaito-duration-ms">' + ms + '</span>' +
              '</div>'
            );
          })
          .join("");

        // KAITO 탭에서 사용하는 findHandleForTopic 재활용 (있으면)
        let topicHandle = "";
        if (typeof findHandleForTopic === "function") {
          topicHandle = findHandleForTopic(projectName);
        } else if (typeof KAITO_TOPIC_TWITTER_HANDLES !== "undefined") {
          const t = String(projectName || "").toLowerCase();
          for (const key in KAITO_TOPIC_TWITTER_HANDLES) {
            if (key.toLowerCase() === t) {
              topicHandle = KAITO_TOPIC_TWITTER_HANDLES[key];
              break;
            }
          }
        }

        let logoUrl = "";
        if (topicHandle) {
          logoUrl = "https://unavatar.io/twitter/" + encodeURIComponent(topicHandle);
        }
        const initial = (projectName || "?").charAt(0).toUpperCase();
        const logoHtml = logoUrl
          ? '<div class="kaito-slider-logo"><img src="' + logoUrl + '" alt="' + projectName + ' logo"></div>'
          : '<div class="kaito-slider-logo">' + initial + "</div>";

        return {
          rankValue: rankValue(primaryRank),
          html:
            '<div class="kaito-slider-card">' +
              '<div class="kaito-slider-header">' +
                logoHtml +
                '<div>' +
                  '<div class="kaito-slider-title">' + projectName + '</div>' +
                  '<div class="kaito-slider-meta">@' + cleanHandle + ' · Tier1 Creator</div>' +
                '</div>' +
              '</div>' +
              '<div class="kaito-slider-body">' +
                (durationRowsHtml ||
                  '<div class="kaito-duration-row kaito-duration-empty">기간별 KAITO 랭킹 데이터를 찾을 수 없어.</div>') +
              '</div>' +
            '</div>'
        };
      }).sort(function (a, b) {
        return a.rankValue - b.rankValue;
      });

      const trackHtml =
        '<div class="kaito-slider-track">' +
          cards.map(function (c) { return c.html; }).join("") +
        '</div>';

      wrap.innerHTML = trackHtml;
    } catch (e) {
      console.warn("renderKaitoDashboardSlider error:", e);
    }
  }

  // 로그인된 사용자의 handle 기준으로 KAITO 자동 로드 (대시보드 전용)
  
  
async function refreshDashboardKaitoForCurrentUser() {
  try {
    const wrap = document.getElementById("kaito-dashboard-slider");
    if (!wrap) return;

    if (typeof window === "undefined" || !window.supabaseClient || typeof KAITOPROXY_URL === "undefined") {
      wrap.innerHTML = '<div class="kaito-slider-empty">로그인 또는 KAITO 설정을 찾을 수 없어.</div>';
      return;
    }

    const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
    if (userError || !userData || !userData.user) {
      console.warn("KAITO auto dashboard: auth.getUser error or empty user", userError, userData);
      wrap.innerHTML = '<div class="kaito-slider-empty">로그인 정보를 불러오지 못했어.</div>';
      return;
    }

    const userId = userData.user.id;
    console.log("KAITO auto dashboard: current user id =", userId);

    const { data: profile, error: profErr } = await supabaseClient
      .from("profiles")
      .select("id, user_id, handle, x_handle")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("KAITO auto dashboard: loaded profile =", profile, "error =", profErr);

    if (profErr) {
      wrap.innerHTML = '<div class="kaito-slider-empty">프로필 정보를 불러오지 못했어.</div>';
      return;
    }

    if (!profile) {
      wrap.innerHTML = '<div class="kaito-slider-empty">프로필이 아직 생성되지 않았어.</div>';
      return;
    }

    let handle = (profile.handle || profile.x_handle || "").trim();
    if (!handle) {
      wrap.innerHTML = '<div class="kaito-slider-empty">프로필에 Twitter 핸들이 저장되어 있지 않아.</div>';
      return;
    }

    const cleanHandle = handle.replace(/^@+/, "");
    console.log("KAITO auto dashboard: using handle =", cleanHandle);

    // 실제 API 호출
    wrap.innerHTML = '<div class="kaito-slider-empty">KAITO Tier1 리더보드 데이터를 불러오는 중...</div>';

    const resp = await fetch(
      KAITOPROXY_URL + "?username=" + encodeURIComponent(cleanHandle),
      { method: "GET" }
    );

    if (!resp.ok) {
      console.error("KAITO auto dashboard: worker fetch failed", resp.status, resp.statusText);
      wrap.innerHTML = '<div class="kaito-slider-empty">KAITO 데이터를 불러오지 못했어. 잠시 후 다시 시도해 줘.</div>';
      return;
    }

    const json = await resp.json();
    const rawList = Array.isArray(json.data) ? json.data : [];
    console.log("KAITO auto dashboard: received project count =", rawList.length);

    renderKaitoDashboardSlider(rawList, cleanHandle);
  } catch (e) {
    console.error("KAITO auto dashboard unexpected error:", e);
  }
}
async function refreshDashboardYapForCurrentUser() {
  const yapEl = document.getElementById("dashboardYapReal");
  if (!yapEl) return;

  yapEl.textContent = "불러오는 중...";

  try {
    if (typeof window === "undefined" || !window.supabaseClient) {
      yapEl.textContent = "-";
      return;
    }

    const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
    if (userError || !userData || !userData.user) {
      console.warn("YAP dashboard: auth.getUser error or empty user", userError, userData);
      yapEl.textContent = "-";
      return;
    }

    const userId = userData.user.id;

    const { data: profile, error: profErr } = await supabaseClient
      .from("profiles")
      .select("handle, x_handle")
      .eq("user_id", userId)
      .maybeSingle();

    if (profErr) {
      console.warn("YAP dashboard: profiles load error:", profErr);
    }

    if (!profile) {
      yapEl.textContent = "-";
      return;
    }

    let handle = (profile.handle || profile.x_handle || "").trim();
    if (!handle) {
      yapEl.textContent = "-";
      return;
    }

    const cleanHandle = handle.replace(/^@+/, "");
    console.log("YAP dashboard: using handle =", cleanHandle);

    const resp = await fetch(
      "https://kaito-yap-proxy.wnehdrla8382.workers.dev/?username=" + encodeURIComponent(cleanHandle),
      { method: "GET" }
    );

    if (!resp.ok) {
      console.error("YAP dashboard: fetch failed", resp.status, resp.statusText);
      yapEl.textContent = "-";
      return;
    }

    const text = await resp.text();
    console.log("YAP dashboard raw text:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error("YAP dashboard JSON parse error:", parseErr);
      yapEl.textContent = "parse error";
      return;
    }

    console.log("YAP dashboard json parsed:", json);

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
      yapEl.textContent = "-";
      return;
    }

    yapEl.textContent = num.toFixed(4);
  } catch (e) {
    console.error("YAP dashboard unexpected error:", e);
    yapEl.textContent = "error";
  }
}

function tryAutoLoadKaitoForCurrentUser() {
    try {
      refreshDashboardKaitoForCurrentUser();
    } catch (e) {
      console.warn("auto kaito load error:", e);
    }
    try {
      if (typeof refreshDashboardYapForCurrentUser === "function") {
        refreshDashboardYapForCurrentUser();
      }
    } catch (e) {
      console.warn("auto yap load error:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      tryAutoLoadKaitoForCurrentUser();
    } catch (e) {
      console.warn("auto load kaito on DOMContentLoaded error:", e);
    }
  });

// 프로필 탭: Supabase 기반 프로필 & 히스토리
    (function () {
      const nameInput = document.getElementById("profileDisplayName");
      const idInput = document.getElementById("profileMuddhaId");
      const handleInput = document.getElementById("profileTwitterHandle");
      const saveBtn = document.getElementById("profileSaveButton");
      const avatar = document.getElementById("profileAvatar");
      const namePreview = document.getElementById("profileNamePreview");
      const handlePreview = document.getElementById("profileHandlePreview");
      const historyList = document.getElementById("profileHistoryList");

      if (!nameInput || !idInput || !handleInput || !saveBtn) return;

      function applyPreview() {
        const dn = nameInput.value.trim() || "붓다";
        const handle = handleInput.value.trim() || "bud_dha__";
        if (namePreview) namePreview.textContent = dn;
        if (handlePreview) handlePreview.textContent = "@" + handle;
        if (avatar) {
          avatar.src = "https://unavatar.io/twitter/" + handle;
        }
      }

      function renderHistory(history) {
        if (!historyList) return;
        historyList.innerHTML = "";
        if (!history || !history.length) {
          const empty = document.createElement("div");
          empty.className = "profile-history-item";
          empty.innerHTML = '<span>아직 기록이 없습니다.</span><span class="profile-history-item-time">-</span>';
          historyList.appendChild(empty);
          return;
        }
        history.slice().reverse().forEach(item => {
          const row = document.createElement("div");
          row.className = "profile-history-item";
          const text = document.createElement("span");
          text.textContent = item.message || "프로필을 수정했습니다.";
          const time = document.createElement("span");
          time.className = "profile-history-item-time";
          time.textContent = item.time || "";
          row.appendChild(text);
          row.appendChild(time);
          historyList.appendChild(row);
        });
      }

      function formatTime(date) {
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        return `${m}. ${d}. ${hh}:${mm}`;
      }

      async function loadProfileFromSupabase() {
        try {
          if (typeof window === "undefined" || !window.supabaseClient) return;
          const { data: { user } } = await window.supabaseClient.auth.getUser();
          if (!user) {
            // 로그인 안 된 상태: 기본 프리뷰만 적용
            nameInput.value = "붓다";
            idInput.value = "";
            handleInput.value = "bud_dha__";
            applyPreview();
            renderHistory([]);
            return;
          }

          // muddha 아이디는 이메일 앞부분에서 유도
          const email = user.email || "";
          const muddahId = email.includes("@") ? email.split("@")[0] : "";
          idInput.value = muddahId;

          const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("nickname, handle, x_handle, muddah_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            console.warn("profiles load error:", error);
          }

          const nickname = (profile && profile.nickname) || "";
          const handle =
            (profile && profile.handle) ||
            (profile && profile.x_handle) ||
            "bud_dha__";

          nameInput.value = nickname || "붓다";
          handleInput.value = handle;
          if (!profile || !profile.muddah_id) {
            // 기존 행이 없거나 muddah_id가 비어 있으면 한번 동기화
            try {
              await supabaseClient
                .from("profiles")
                .upsert(
                  {
                    id: user.id,
                    user_id: user.id,
                    muddah_id: muddahId || null,
                    nickname: nickname || "붓다",
                    handle: handle,
                    x_handle: handle
                  },
                  { onConflict: "id" }
                );
            } catch (e) {
              console.warn("profiles auto-sync error:", e);
            }
          }

          applyPreview();
          const history = [{
            time: formatTime(new Date()),
            message: "프로필 정보를 불러왔습니다."
          }];
          renderHistory(history);
        } catch (e) {
          console.error("프로필 로드 오류", e);
        }
      }

      async function saveProfileToSupabase() {
        try {
          if (typeof window === "undefined" || !window.supabaseClient) return;
          const { data: { user } } = await window.supabaseClient.auth.getUser();
          if (!user) {
            alert("먼저 로그인해 주세요.");
            return;
          }

          const displayName = nameInput.value.trim() || "붓다";
          const muddahId = idInput.value.trim();
          const twitterHandle = handleInput.value.trim() || "bud_dha__";

          await supabaseClient
            .from("profiles")
            .upsert(
              {
                id: user.id,
                user_id: user.id,
                muddah_id: muddahId || null,
                nickname: displayName,
                handle: twitterHandle,
                x_handle: twitterHandle
              },
              { onConflict: "id" }
            );

          applyPreview();
          const now = new Date();
          const history = [{
            time: formatTime(now),
            message: "프로필 정보를 저장했습니다."
          }];
          renderHistory(history);
        } catch (e) {
          console.error("프로필 저장 오류", e);
        }

      if (typeof window !== "undefined") {
        window.muddhaProfileReload = loadProfileFromSupabase;
      }
      }

      saveBtn.addEventListener("click", function () {
        saveProfileToSupabase();
      });

      nameInput.addEventListener("input", applyPreview);
      handleInput.addEventListener("input", applyPreview);

      loadProfileFromSupabase();
    })()
;

export { fetchKaitoLeaderboard, renderKaitoDashboardSlider };