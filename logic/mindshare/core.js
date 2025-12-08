// 프로젝트별 마인드쉐어 계산 코어 모듈
// - PROJECTS 정의
// - 텍스트에서 프로젝트 추론
// - csvAllPosts 기반 프로젝트별 포스트 빌드
// - 프로젝트별 집계(점수/트림드 평균/등급 분포)

// ---- 프로젝트 정의: Cookie leaderboard 파일에서 가져온 PROJECTS ----
const PROJECTS = [
  // --- L0 / L1 ---
  { id: "aptos",       label: "Aptos",                  category: "L0/L1", keywords: ["aptos"] },
  { id: "beldex",      label: "Beldex",                 category: "L0/L1", keywords: ["beldex"] },
  { id: "berachain",   label: "Berachain",              category: "L0/L1", keywords: ["berachain"] },
  { id: "camp",        label: "Camp Network",           category: "L0/L1", keywords: ["camp network","campnet"] },
  { id: "ethereum",    label: "Ethereum",               category: "L0/L1", keywords: ["ethereum","eth "] },
  { id: "fogo",        label: "Fogo",                   category: "L0/L1", keywords: ["fogo"] },
  { id: "injective",   label: "Injective",              category: "L0/L1", keywords: ["injective","inj "] },
  { id: "irys",        label: "Irys",                   category: "L0/L1", keywords: ["irys"] },
  { id: "kaia",        label: "Kaia",                   category: "L0/L1", keywords: ["kaia"] },
  { id: "mantra",      label: "MANTRA",                 category: "L0/L1", keywords: ["mantra"] },
  { id: "mavryk",      label: "Mavryk",                 category: "L0/L1", keywords: ["mavryk"] },
  { id: "mitosis",     label: "Mitosis",                category: "L0/L1", keywords: ["mitosis"] },
  { id: "monad",       label: "Monad",                  category: "L0/L1", keywords: ["monad"] },
  { id: "movement",    label: "Movement",               category: "L0/L1", keywords: ["movement"] },
  { id: "near",        label: "Near",                   category: "L0/L1", keywords: ["near"] },
  { id: "peaq",        label: "PEAQ",                   category: "L0/L1", keywords: ["peaq"] },
  { id: "polkadot",    label: "Polkadot",               category: "L0/L1", keywords: ["polkadot","dot "] },
  { id: "sei",         label: "Sei",                    category: "L0/L1", keywords: ["sei "] },
  { id: "somnia",      label: "Somnia",                 category: "L0/L1", keywords: ["somnia"] },
  { id: "sonic",       label: "Sonic (L1)",             category: "L0/L1", keywords: ["sonic chain","sonic l1","sonic mainnet"] },
  { id: "story",       label: "Story",                  category: "L0/L1", keywords: ["story protocol","story chain"] },
  { id: "xion",        label: "XION",                   category: "L0/L1", keywords: ["xion"] },

  // --- L2 ---
  { id: "arbitrum",    label: "Arbitrum",               category: "L2",    keywords: ["arbitrum","arb "] },
  { id: "katana",      label: "Katana",                 category: "L2",    keywords: ["katana"] },
  { id: "mantle",      label: "Mantle",                 category: "L2",    keywords: ["mantle"] },
  { id: "megaeth",     label: "MegaETH",                category: "L2",    keywords: ["megaeth"] },
  { id: "polygon",     label: "Polygon",                category: "L2",    keywords: ["polygon","matic"] },
  { id: "soon",        label: "SOON",                   category: "L2",    keywords: ["soon network","soon chain"] },

  // --- DeFi / Infra ---
  { id: "falcon",      label: "Falcon Finance",         category: "DeFi",  keywords: ["falcon finance","falconfi"] },
  { id: "frax",        label: "Frax",                   category: "DeFi",  keywords: ["frax"] },
  { id: "huma",        label: "Huma",                   category: "DeFi",  keywords: ["huma"] },
  { id: "moremarkets", label: "MoreMarkets",            category: "DeFi",  keywords: ["moremarkets","more markets"] },
  { id: "multipli",    label: "Multipli",               category: "DeFi",  keywords: ["multipli"] },
  { id: "noble",       label: "Noble",                  category: "DeFi",  keywords: ["noble chain","noble network"] },
  { id: "orderly",     label: "Orderly",                category: "DeFi",  keywords: ["orderly","orderly network","orderly omni"] },
  { id: "pyth",        label: "Pyth",                   category: "DeFi",  keywords: ["pyth oracle","pyth network"] },
  { id: "soul",        label: "Soul Protocol",          category: "DeFi",  keywords: ["soul protocol"] },
  { id: "stbl",        label: "STBL",                   category: "DeFi",  keywords: ["stbl","usst","yld","stablecoin 2.0"] },
  { id: "turtle",      label: "Turtle Club",            category: "DeFi",  keywords: ["turtle club"] },
  { id: "walrus",      label: "Walrus",                 category: "DeFi",  keywords: ["walrus"] },

  // --- AI Agents / Agent Infra ---
  { id: "creatorbid",  label: "CreatorBid",             category: "AI Agents", keywords: ["creatorbid"] },
  { id: "infinit",     label: "INFINIT",                category: "AI Agents", keywords: ["infinit"] },
  { id: "newton",      label: "Newton",                 category: "AI Agents", keywords: ["newton ai"] },
  { id: "surf",        label: "Surf",                   category: "AI Agents", keywords: ["surf ai","surf agent"] },
  { id: "symphony",    label: "Symphony",               category: "AI Agents", keywords: ["symphony","symphony finance","symphony router"] },
  { id: "talus",       label: "Talus",                  category: "AI Agents", keywords: ["talus"] },
  { id: "theoriq",     label: "Theoriq",                category: "AI Agents", keywords: ["theoriq"] },
  { id: "virtuals",    label: "Virtuals Protocol",      category: "AI Agents", keywords: ["virtuals","virtuals protocol"] },
  { id: "warden",      label: "Warden Protocol",        category: "AI Agents", keywords: ["warden protocol"] },
  { id: "wayfinder",   label: "Wayfinder",              category: "AI Agents", keywords: ["wayfinder"] },

  // --- Culture / NFT ---
  { id: "anime",       label: "ANIME",                  category: "Culture", keywords: ["anime token","anime protocol"] },
  { id: "boop",        label: "Boop",                   category: "Culture", keywords: ["boop"] },
  { id: "doodles",     label: "Doodles",                category: "Culture", keywords: ["doodles"] },
  { id: "memex",       label: "MemeX",                  category: "Culture", keywords: ["memex"] },
  { id: "moonbirds",   label: "Moonbirds",              category: "Culture", keywords: ["moonbirds"] },
  { id: "pengu",       label: "PENGU",                  category: "Culture", keywords: ["pengu"] },

  // --- BTCFi ---
  { id: "corn",        label: "Corn",                   category: "BTCFi",  keywords: ["corn"] },
  { id: "goat",        label: "GOAT Network",           category: "BTCFi",  keywords: ["goat network"] },
  { id: "lombard",     label: "Lombard",                category: "BTCFi",  keywords: ["lombard"] },
  { id: "portalbtc",   label: "Portal to BTC",          category: "BTCFi",  keywords: ["portal to btc","portal btc"] },
  { id: "satlayer",    label: "SatLayer",               category: "BTCFi",  keywords: ["satlayer"] },

  // --- Robotics ---
  { id: "openmind",    label: "Openmind",               category: "Robotics", keywords: ["openmind"] },

  // --- ZK ---
  { id: "boundless",   label: "Boundless",              category: "ZK", keywords: ["boundless"] },
  { id: "brevis",      label: "Brevis",                 category: "ZK", keywords: ["brevis"] },
  { id: "cysic",       label: "Cysic",                  category: "ZK", keywords: ["cysic"] },
  { id: "miden",       label: "Miden",                  category: "ZK", keywords: ["miden"] },
  { id: "starknet",    label: "Starknet",               category: "ZK", keywords: ["starknet"] },
  { id: "succinct",    label: "Succinct",               category: "ZK", keywords: ["succinct"] },
  { id: "zcash",       label: "Zcash",                  category: "ZK", keywords: ["zcash"] },
  { id: "zkpass",      label: "zkPass",                 category: "ZK", keywords: ["zkpass"] },

  // --- Others ---
  { id: "anoma",       label: "Anoma",                  category: "Others", keywords: ["anoma"] },
  { id: "bless",       label: "Bless",                  category: "Others", keywords: ["bless protocol"] },
  { id: "bybittradfi", label: "Bybit TradFi",           category: "Others", keywords: ["bybit tradfi"] },
  { id: "humanity",    label: "Humanity Protocol",      category: "Others", keywords: ["humanity protocol"] },
  { id: "integra",     label: "Integra",                category: "Others", keywords: ["integra"] },
  { id: "multibank",   label: "Multibank",              category: "Others", keywords: ["multibank"] },
  { id: "thrive",      label: "Thrive Protocol",        category: "Others", keywords: ["thrive protocol"] },

  // --- Exchange / Perp ---
  { id: "apex",        label: "ApeX",                   category: "Exchange", keywords: ["apex pro","apex dex"] },
  { id: "bluefin",     label: "Bluefin",                category: "Exchange", keywords: ["bluefin"] },
  { id: "dydx",        label: "dYdX",                   category: "Exchange", keywords: ["dydx"] },
  { id: "flipster",    label: "Flipster",               category: "Exchange", keywords: ["flipster"] },
  { id: "mememax",     label: "MemeMax",                category: "Exchange", keywords: ["mememax","mememax_fi","@mememax_fi","memax"] },
  { id: "momentum",    label: "Momentum",               category: "Exchange", keywords: ["momentum"] },
  { id: "paradex",     label: "PARADEX",                category: "Exchange", keywords: ["paradex"] },

  // --- AI / InfoFi ---
  { id: "kaito",       label: "Kaito / Yapper",         category: "AI", keywords: ["kaito","kaito ai","yapper","yap points","infofi"] },
  { id: "og",          label: "OG",                     category: "AI", keywords: ["og protocol"] },
  { id: "allora",      label: "Allora",                 category: "AI", keywords: ["allora"] },
  { id: "billions",    label: "Billions Network",       category: "AI", keywords: ["billions network"] },
  { id: "edgen",       label: "Edgen",                  category: "AI", keywords: ["edgen"] },
  { id: "everlynai",   label: "EverlynAI",              category: "AI", keywords: ["everlynai"] },
  { id: "iq",          label: "IQ",                     category: "AI", keywords: ["iq ai","iq token"] },
  { id: "kindred",     label: "Kindred",                category: "AI", keywords: ["kindred"] },
  { id: "mira",        label: "Mira Network",           category: "AI", keywords: ["mira network"] },
  { id: "novastro",    label: "Novastro",               category: "AI", keywords: ["novastro"] },
  { id: "noya",        label: "Noya.ai",                category: "AI", keywords: ["noya.ai","noya ai"] },
  { id: "openledger",  label: "OpenLedger",             category: "AI", keywords: ["openledger"] },
  { id: "pipworld",    label: "PiP World",              category: "AI", keywords: ["pip world","pipworld"] },
  { id: "playai",      label: "PlayAI",                 category: "AI", keywords: ["playai","play ai"] },
  { id: "sapien",      label: "Sapien",                 category: "AI", keywords: ["sapien"] },
  { id: "sentient",    label: "Sentient",               category: "AI", keywords: ["sentient"] },
  { id: "uxlink",      label: "UXLINK",                 category: "AI", keywords: ["uxlink"] },

  // --- Consumer / Apps ---
  { id: "tria",        label: "Tria",                   category: "Consumer", keywords: ["tria","use tria","@useTria"] },
  { id: "anichess",    label: "Anichess",               category: "Consumer", keywords: ["anichess"] },
  { id: "bitdealer",   label: "Bitdealer",              category: "Consumer", keywords: ["bitdealer"] },
  { id: "defiapp",     label: "Defi App",               category: "Consumer", keywords: ["defi app"] },
  { id: "hana",        label: "Hana",                   category: "Consumer", keywords: ["hana app"] },
  { id: "infinex",     label: "Infinex",                category: "Consumer", keywords: ["infinex"] },
  { id: "lumiterra",   label: "Lumiterra",              category: "Consumer", keywords: ["lumiterra"] },
  { id: "maplestory",  label: "MapleStory Universe",    category: "Consumer", keywords: ["maplestory universe","msu"] },
  { id: "metawin",     label: "Metawin",                category: "Consumer", keywords: ["metawin"] },
  { id: "parti",       label: "Parti",                  category: "Consumer", keywords: ["parti"] },
  { id: "puffpaw",     label: "Puffpaw",                category: "Consumer", keywords: ["puffpaw"] },
  { id: "rainbow",     label: "Rainbow",                category: "Consumer", keywords: ["rainbow wallet","rainbow app"] },
  { id: "sidekick",    label: "Sidekick",               category: "Consumer", keywords: ["sidekick"] },
  { id: "sixr",        label: "SIXR Cricket",           category: "Consumer", keywords: ["sixr cricket","sixr"] },
  { id: "sophon",      label: "Sophon",                 category: "Consumer", keywords: ["sophon"] },
  { id: "vultisig",    label: "Vultisig",               category: "Consumer", keywords: ["vultisig"] },
  { id: "yeet",        label: "YEET",                   category: "Consumer", keywords: ["yeet"] },

  // --- Interop ---
  { id: "caldera",     label: "Caldera",                category: "Interop", keywords: ["caldera"] },
  { id: "initia",      label: "Initia",                 category: "Interop", keywords: ["initia"] },
  { id: "skate",       label: "Skate",                  category: "Interop", keywords: ["skate"] },
  { id: "union",       label: "Union",                  category: "Interop", keywords: ["union"] },

  // --- RWA ---
  { id: "kaio",        label: "KAIO",                   category: "RWA", keywords: ["kaio","kaio network"] },
  { id: "theo",        label: "Theo Network",           category: "RWA", keywords: ["theo","theo network","thbill","tultra"] },

  // --- Snapper / Campaign style(마인드쉐어용) ---
  { id: "superform",   label: "Superform",              category: "Campaign", keywords: ["superform","superformxyz","@superformxyz"] },
  { id: "glint",       label: "Glint Analytics",        category: "Campaign", keywords: ["glint analytics","@glintanalytics"] },
  { id: "solv",        label: "Solv Protocol",          category: "Campaign", keywords: ["solv protocol","@solvprotocol"] },
  { id: "pacifica",    label: "Pacifica",               category: "Campaign", keywords: ["pacifica_fi","@pacifica_fi","pacifica fi"] },
  { id: "layerbank",   label: "LayerBank",              category: "Campaign", keywords: ["layerbank","layerbankfi","@layerbankfi"] },
  { id: "rayls",       label: "Rayls",                  category: "Campaign", keywords: ["rayls","@RaylsLabs","raylslabs"] },
  { id: "velora",      label: "Velora",                 category: "Campaign", keywords: ["velora","veloradex","@veloradex"] },
  { id: "antix",       label: "Antix",                  category: "Campaign", keywords: ["antix","@antix_in"] },
  { id: "almanak",     label: "Almanak",                category: "Campaign", keywords: ["almanak","@Almanak"] },
  { id: "bob",         label: "BOB",                    category: "Campaign", keywords: ["bob","build on bitcoin","@build_on_bob"] },
  { id: "ten",         label: "TEN Protocol",           category: "Campaign", keywords: ["ten protocol","@tenprotocol","ten app"] },
  { id: "vooi",        label: "Vooi",                   category: "Campaign", keywords: ["vooi","@vooi_io","vooi io"] },

  // --- 너 전용(이미 CSV에서 자주 쓰는 것들) ---
  { id: "river",       label: "River / satUSD",         category: "Stable", keywords: ["river","satusd","sat usd","river4fun","river4 fun","@riverhq"] },
  { id: "cookie",      label: "Cookie.fun",             category: "InfoFi", keywords: ["cookie.fun","cookie fun","cookie leaderboard","@cookie_fun"] },
  { id: "bnkr",        label: "BNKR / BANKR",           category: "Social", keywords: ["bnkr","bankr","bankr leaderboard","@bnkr_network"] }
];

// 텍스트에서 프로젝트를 추론하는 함수


function inferProjectFromText(textRaw) {
  const text = String(textRaw || "").toLowerCase();
  if (!text.trim()) return "기타";
  for (const proj of PROJECTS) {
    if (!proj.keywords || !proj.keywords.length) continue;
    for (const kwRaw of proj.keywords) {
      const kw = String(kwRaw || "").toLowerCase();
      if (!kw) continue;
      if (text.includes(kw)) {
        return proj.label || proj.id || "기타";
      }
    }
  }
  return "기타";
}

function buildProjectPostsFromCsv() {
  const src = (window.csvAllPosts || []).slice();
  if (!src.length) return [];

  return src.map((p, idx) => {
    const text = p.text || p.snippet || "";
    const project = inferProjectFromText(text);
    const tier = (p.tier || p.grade || "C").toUpperCase();
    const engagement = (typeof p.engagement === "number")
      ? p.engagement
      : ((p.likes || 0) + (p.retweets || 0) + (p.replies || 0) + (p.quotes || 0) + (p.bookmarks || 0));
    const impressions = p.impressions || p.imps || 0;
    const score = (typeof p.score === "number") ? p.score : 0;

    return {
      id: idx + 1,
      project,
      score,
      tier,
      text,
      engagement,
      impressions,
      url: p.url || "#",
      likes: p.likes || 0,
      retweets: p.retweets || 0,
      replies: p.replies || 0,
      quotes: p.quotes || 0,
      bookmarks: p.bookmarks || 0
    };
  });
}

function aggregateByProject(posts) {
      const projMap = new Map();

      for (const p of posts) {
        const key = p.project || "기타";
        if (!projMap.has(key)) {
          projMap.set(key, {
            name: key,
            count: 0,
            sumScore: 0,
            scores: [],
            grades: { S: 0, A: 0, B: 0, C: 0 },
            topPost: null
          });
        }
        const proj = projMap.get(key);
        const score = typeof p.score === "number" ? p.score : 0;
        proj.count += 1;
        proj.sumScore += score;
        proj.scores.push(score);

        const t = (p.tier || "C").toUpperCase();
        if (proj.grades[t] != null) proj.grades[t] += 1;
      }

      function computeTrimmed(arr, ratio = 0.1) {
        if (!arr.length) return 0;
        const sorted = arr.slice().sort((a, b) => a - b);
        let n = sorted.length;
        let k = Math.floor(n * ratio);
        if (k * 2 >= n) k = 0;
        const trimmed = sorted.slice(k, n - k);
        const sum = trimmed.reduce((s, v) => s + v, 0);
        return trimmed.length ? sum / trimmed.length : 0;
      }

      const gradeCountAll = { S: 0, A: 0, B: 0, C: 0 };
      const list = Array.from(projMap.values()).map(p => {
        for (const g of ["S","A","B","C"]) {
          gradeCountAll[g] += p.grades[g] || 0;
        }
        return {
          ...p,
          avgScore: p.count ? p.sumScore / p.count : 0,
          avgTrimmed: p.count ? computeTrimmed(p.scores) : 0
        };
      });

      list.sort((a, b) => b.count - a.count || b.avgScore - a.avgScore);
      return { projects: list, gradeCountAll };
    }

// 모듈 외부에서 사용할 수 있는 함수들
export { PROJECTS, buildProjectPostsFromCsv, aggregateByProject };

console.debug("[MUDDHA] mindshare/core.js loaded (PROJECTS, buildProjectPostsFromCsv, aggregateByProject).");
