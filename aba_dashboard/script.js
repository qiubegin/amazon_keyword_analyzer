/**
 * 亚马逊ABA关键词趋势分析
 * 数据来源: 20260603_215741_DE__20260603_215435.csv
 * 生成时间: 2026-06-14 00:32:55
 */

const TOP_KEYWORDS = [
  {
    "rank": 1,
    "keyword": "off campus",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "books",
    "category": "📚 图书音像",
    "category_icon": "📚",
    "trend": "-12%",
    "prevRank": 1
  },
  {
    "rank": 2,
    "keyword": "lol last one laughing",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "toys",
    "category": "🎮 玩具游戏",
    "category_icon": "🎮",
    "trend": "-16%",
    "prevRank": 1
  },
  {
    "rank": 4,
    "keyword": "lol",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "toys",
    "category": "🎮 玩具游戏",
    "category_icon": "🎮",
    "trend": "+13%",
    "prevRank": 5
  },
  {
    "rank": 5,
    "keyword": "pool",
    "brand": "INTEX",
    "category_raw": "Lawn and Garden",
    "category_key": "sports",
    "category": "🏃 运动户外",
    "category_icon": "🏃",
    "trend": "-5%",
    "prevRank": 5
  },
  {
    "rank": 6,
    "keyword": "ventilator",
    "brand": "DREO",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "-22%",
    "prevRank": 7
  },
  {
    "rank": 7,
    "keyword": "klimaanlage",
    "brand": "WoleixHaus",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+23%",
    "prevRank": 8
  },
  {
    "rank": 8,
    "keyword": "fliegengitter fenster",
    "brand": "tesa",
    "category_raw": "Home Improvement",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+7%",
    "prevRank": 10
  },
  {
    "rank": 9,
    "keyword": "off",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "-15%",
    "prevRank": 12
  },
  {
    "rank": 10,
    "keyword": "sommerkleid damen",
    "brand": "AUSELILY",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+23%",
    "prevRank": 11
  },
  {
    "rank": 11,
    "keyword": "meine bestellungen anzeigen",
    "brand": "Amazon Essentials",
    "category_raw": "Softlines_Private_Label",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "-5%",
    "prevRank": 13
  },
  {
    "rank": 12,
    "keyword": "from",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "books",
    "category": "📚 图书音像",
    "category_icon": "📚",
    "trend": "-8%",
    "prevRank": 12
  },
  {
    "rank": 13,
    "keyword": "lo",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "+3%",
    "prevRank": 10
  },
  {
    "rank": 14,
    "keyword": "klimaanlage mobil",
    "brand": "WoleixHaus",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "-14%",
    "prevRank": 11
  },
  {
    "rank": 15,
    "keyword": "sandalen damen",
    "brand": "The Drop",
    "category_raw": "Softlines_Private_Label",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "-30%",
    "prevRank": 18
  },
  {
    "rank": 17,
    "keyword": "sonnenschirm",
    "brand": "4smile",
    "category_raw": "Lawn and Garden",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+28%",
    "prevRank": 14
  },
  {
    "rank": 18,
    "keyword": "panini wm 2026 sticker",
    "brand": "PANINI",
    "category_raw": "Home",
    "category_key": "sports",
    "category": "🏃 运动户外",
    "category_icon": "🏃",
    "trend": "+25%",
    "prevRank": 15
  },
  {
    "rank": 19,
    "keyword": "fliegengitter balkontür",
    "brand": "Apalus",
    "category_raw": "Home Improvement",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+2%",
    "prevRank": 21
  },
  {
    "rank": 20,
    "keyword": "musselin decke",
    "brand": "EMME",
    "category_raw": "Home",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+6%",
    "prevRank": 19
  },
  {
    "rank": 21,
    "keyword": "kurze hosen herren",
    "brand": "Tansozer",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+17%",
    "prevRank": 22
  },
  {
    "rank": 22,
    "keyword": "sonnenbrille herren",
    "brand": "Perfectmiaoxuan",
    "category_raw": "Shoes",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "-30%",
    "prevRank": 20
  },
  {
    "rank": 23,
    "keyword": "bikini damen set",
    "brand": "iSLASISIA",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+24%",
    "prevRank": 26
  },
  {
    "rank": 24,
    "keyword": "the boys",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "books",
    "category": "📚 图书音像",
    "category_icon": "📚",
    "trend": "+20%",
    "prevRank": 27
  },
  {
    "rank": 25,
    "keyword": "eiswürfelmaschine",
    "brand": "PALINTH",
    "category_raw": "Biss",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+10%",
    "prevRank": 27
  },
  {
    "rank": 26,
    "keyword": "badehose herren",
    "brand": "Ougelebo",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "-1%",
    "prevRank": 23
  },
  {
    "rank": 27,
    "keyword": "planschbecken",
    "brand": "Bestway",
    "category_raw": "Lawn and Garden",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "-22%",
    "prevRank": 27
  },
  {
    "rank": 28,
    "keyword": "dutton ranch",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "toys",
    "category": "🎮 玩具游戏",
    "category_icon": "🎮",
    "trend": "+5%",
    "prevRank": 31
  },
  {
    "rank": 29,
    "keyword": "sonnensegel",
    "brand": "LOVE STORY",
    "category_raw": "Lawn and Garden",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+10%",
    "prevRank": 31
  },
  {
    "rank": 30,
    "keyword": "kurze hose damen",
    "brand": "StylSense",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "-11%",
    "prevRank": 33
  },
  {
    "rank": 31,
    "keyword": "t shirt herren",
    "brand": "FM London",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+7%",
    "prevRank": 30
  },
  {
    "rank": 32,
    "keyword": "spiderman",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "toys",
    "category": "🎮 玩具游戏",
    "category_icon": "🎮",
    "trend": "+10%",
    "prevRank": 33
  },
  {
    "rank": 33,
    "keyword": "iphone 17",
    "brand": "Apple",
    "category_raw": "Wireless",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+19%",
    "prevRank": 33
  },
  {
    "rank": 34,
    "keyword": "badeanzug damen",
    "brand": "CUPSHE",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+29%",
    "prevRank": 32
  },
  {
    "rank": 35,
    "keyword": "euphoria",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "books",
    "category": "📚 图书音像",
    "category_icon": "📚",
    "trend": "+25%",
    "prevRank": 38
  },
  {
    "rank": 36,
    "keyword": "mobile klimaanlage",
    "brand": "WoleixHaus",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+10%",
    "prevRank": 38
  },
  {
    "rank": 37,
    "keyword": "wasserpistole",
    "brand": "Quanquer",
    "category_raw": "Toys",
    "category_key": "sports",
    "category": "🏃 运动户外",
    "category_icon": "🏃",
    "trend": "-1%",
    "prevRank": 37
  },
  {
    "rank": 38,
    "keyword": "ventilator leise",
    "brand": "Brandson",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+14%",
    "prevRank": 41
  },
  {
    "rank": 39,
    "keyword": "klimaanlage ohne abluftschlauch",
    "brand": "Brandson",
    "category_raw": "Home Improvement",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "+9%",
    "prevRank": 42
  },
  {
    "rank": 40,
    "keyword": "sandalen mädchen",
    "brand": "Amazon Essentials",
    "category_raw": "Shoes",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+16%",
    "prevRank": 43
  },
  {
    "rank": 41,
    "keyword": "bikini",
    "brand": "Zojuyozio",
    "category_raw": "Apparel",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "+9%",
    "prevRank": 44
  },
  {
    "rank": 44,
    "keyword": "power bank",
    "brand": "INIU",
    "category_raw": "Wireless",
    "category_key": "electronics",
    "category": "📱 电子产品",
    "category_icon": "📱",
    "trend": "-25%",
    "prevRank": 42
  },
  {
    "rank": 45,
    "keyword": "planschbecken für kinder",
    "brand": "Bestway",
    "category_raw": "Lawn and Garden",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+5%",
    "prevRank": 47
  },
  {
    "rank": 46,
    "keyword": "sonnenbrille damen",
    "brand": "LINVO",
    "category_raw": "Shoes",
    "category_key": "clothing",
    "category": "👕 服装服饰",
    "category_icon": "👕",
    "trend": "-22%",
    "prevRank": 49
  },
  {
    "rank": 47,
    "keyword": "kühlmatte hund",
    "brand": "pecute",
    "category_raw": "Pet Products",
    "category_key": "home",
    "category": "🏠 家居用品",
    "category_icon": "🏠",
    "trend": "+11%",
    "prevRank": 44
  },
  {
    "rank": 48,
    "keyword": "spider noir",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "toys",
    "category": "🎮 玩具游戏",
    "category_icon": "🎮",
    "trend": "-9%",
    "prevRank": 48
  },
  {
    "rank": 49,
    "keyword": "more nutrition",
    "brand": "MORE NUTRITION",
    "category_raw": "Health & Personal Care",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "+29%",
    "prevRank": 50
  },
  {
    "rank": 51,
    "keyword": "two and a half men",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "+28%",
    "prevRank": 54
  },
  {
    "rank": 53,
    "keyword": "ninja creami",
    "brand": "NINJA",
    "category_raw": "Kitchen",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "-6%",
    "prevRank": 53
  },
  {
    "rank": 54,
    "keyword": "luftmatratze pool",
    "brand": "Bestway",
    "category_raw": "Sports",
    "category_key": "sports",
    "category": "🏃 运动户外",
    "category_icon": "🏃",
    "trend": "+15%",
    "prevRank": 52
  },
  {
    "rank": 55,
    "keyword": "spi",
    "brand": "其他",
    "category_raw": "Digital_Video_Download",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "+13%",
    "prevRank": 56
  },
  {
    "rank": 56,
    "keyword": "deutschland trikot 2026",
    "brand": "adidas skateboarding",
    "category_raw": "Apparel",
    "category_key": "other",
    "category": "📌 其他",
    "category_icon": "📌",
    "trend": "+30%",
    "prevRank": 56
  }
];
const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29", "W30", "W31", "W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39", "W40", "W41", "W42", "W43", "W44", "W45", "W46", "W47", "W48", "W49", "W50", "W51", "W52"];
const YEARLY_DATA = {
  "2024": {
    "weekly_ranks": [
      118,
      120,
      122,
      120,
      124,
      124,
      131,
      122,
      121,
      120,
      117,
      120,
      121,
      128,
      114,
      110,
      112,
      116,
      114,
      124,
      125,
      112,
      108,
      112,
      119,
      120,
      122,
      118,
      105,
      104,
      114,
      108,
      107,
      112,
      116,
      108,
      109,
      102,
      108,
      112,
      113,
      116,
      98,
      98,
      98,
      108,
      110,
      108,
      110,
      98,
      96,
      98
    ],
    "total_keywords": 50,
    "avg_rank": 113,
    "best_rank": 96,
    "worst_rank": 131
  },
  "2025": {
    "weekly_ranks": [
      82,
      87,
      83,
      90,
      89,
      74,
      80,
      86,
      83,
      92,
      73,
      77,
      82,
      85,
      91,
      80,
      80,
      85,
      86,
      87,
      71,
      74,
      83,
      80,
      88,
      76,
      71,
      75,
      83,
      86,
      70,
      73,
      77,
      81,
      82,
      72,
      71,
      77,
      78,
      79,
      66,
      67,
      76,
      80,
      82,
      64,
      69,
      68,
      71,
      74,
      64,
      68
    ],
    "total_keywords": 50,
    "avg_rank": 78,
    "best_rank": 64,
    "worst_rank": 92
  },
  "2026": {
    "weekly_ranks": [
      51,
      41,
      47,
      42,
      42,
      46,
      42,
      39,
      45,
      43,
      38,
      40,
      43,
      35,
      38,
      37,
      37,
      33,
      38,
      33,
      37,
      28,
      26,
      30,
      32,
      24,
      28,
      27,
      30,
      27,
      23,
      28,
      21,
      28,
      20,
      24,
      26,
      18,
      24,
      20,
      19,
      25,
      22,
      23,
      19,
      22,
      23,
      15,
      17,
      22,
      18,
      16
    ],
    "total_keywords": 50,
    "avg_rank": 30,
    "best_rank": 15,
    "worst_rank": 51
  }
};
const CATEGORY_NAMES = {"clothing": "👕 服装服饰", "electronics": "📱 电子产品", "home": "🏠 家居用品", "sports": "🏃 运动户外", "toys": "🎮 玩具游戏", "books": "📚 图书音像", "other": "📌 其他"};
const CATEGORY_ICONS = {"clothing": "👕", "electronics": "📱", "home": "🏠", "sports": "🏃", "toys": "🎮", "books": "📚", "other": "📌"};
const CURRENT_AVG_RANK = 28;

let currentYear = '2026';
let currentCategory = 'all';
let currentChart = null;
let currentZoom = { start: 0, end: 100 };

function init() {
    updateCategoryCounts();
    setupEventListeners();
    updateKPI(currentYear);
    updateTable();
    renderChart();
}

function updateCategoryCounts() {
    const counts = {};
    TOP_KEYWORDS.forEach(kw => { counts[kw.category_key] = (counts[kw.category_key] || 0) + 1; });
    document.querySelectorAll('.cat-btn').forEach(btn => {
        const cat = btn.dataset.cat;
        if (cat === 'all') btn.innerHTML = `📌 全部 (${TOP_KEYWORDS.length})`;
        else if (counts[cat]) btn.innerHTML = `${CATEGORY_ICONS[cat] || '📌'} ${CATEGORY_NAMES[cat] || cat} (${counts[cat]})`;
    });
}

function setupEventListeners() {
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentYear = btn.dataset.year;
            if (currentYear === 'compare') {
                renderComparisonChart();
                document.getElementById('chartTitle').textContent = '关键词排名趋势 - 2024/2025/2026 三年对比';
            } else {
                updateKPI(currentYear);
                renderChart();
                document.getElementById('chartTitle').textContent = `关键词排名趋势 - ${currentYear}年`;
            }
        });
    });
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            updateTable();
        });
    });
    document.getElementById('zoomInBtn')?.addEventListener('click', () => zoomChart('in'));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoomChart('out'));
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => zoomChart('reset'));
    window.addEventListener('resize', () => currentChart?.resize());
    document.getElementById('updateTime').textContent = new Date().toLocaleDateString();
}

function updateKPI(year) {
    const data = YEARLY_DATA[year];
    if (!data) return;
    const weeklyRanks = data.weekly_ranks;
    const currentRank = weeklyRanks[weeklyRanks.length - 1];
    const firstRank = weeklyRanks[0];
    const changePercent = ((currentRank - firstRank) / firstRank * 100).toFixed(1);
    const isImproving = currentRank < firstRank;
    document.getElementById('currentRank').innerHTML = `${currentRank}<span class="kpi-unit">位</span>`;
    document.getElementById('avgRank').innerHTML = `${data.avg_rank}<span class="kpi-unit">位</span>`;
    document.getElementById('bestRank').innerHTML = `${data.best_rank}<span class="kpi-unit">位</span>`;
    document.getElementById('totalKeywords').innerHTML = `${data.total_keywords.toLocaleString()}<span class="kpi-unit">个</span>`;
    const trendEl = document.getElementById('rankTrend');
    trendEl.innerHTML = isImproving ? `📈 年度改善 ${Math.abs(changePercent)}%` : `📉 年度恶化 ${Math.abs(changePercent)}%`;
    trendEl.className = `kpi-trend ${isImproving ? 'trend-up' : 'trend-down'}`;
}

function updateTable() {
    let filtered = [...TOP_KEYWORDS];
    if (currentCategory !== 'all') filtered = filtered.filter(k => k.category_key === currentCategory);
    const tableBody = document.getElementById('tableBody');
    if (filtered.length === 0) { tableBody.innerHTML = '<div class="loading">暂无数据</div>'; return; }
    tableBody.innerHTML = filtered.slice(0, 50).map((item, idx) => {
        const trendValue = parseFloat(item.trend);
        const isUp = trendValue > 0;
        const trendClass = isUp ? 'trend-up' : 'trend-down';
        const trendSymbol = isUp ? '↑' : '↓';
        return `<div class="table-row"><div class="rank-col">${idx + 1}</div><div class="keyword-col" title="${item.keyword}">${item.keyword}</div><div class="text-right ${trendClass}">${trendSymbol} ${Math.abs(trendValue).toFixed(1)}%</div><div class="text-right">${item.category}</div><div class="text-right">🏷️ ${item.brand}</div></div>`;
    }).join('');
}

function rankAxisFor(...rankLists) {
    const values = rankLists.flat().map(Number).filter(value => Number.isFinite(value) && value > 0);
    const maxRank = values.length ? Math.max(...values) : 1;
    const step = maxRank <= 100 ? 10 : maxRank <= 1000 ? 100 : maxRank <= 10000 ? 1000 : 10000;
    const zeroSlot = Math.ceil(maxRank / step) * step + step;
    return { min: values.length ? Math.min(...values) : 1, max: zeroSlot, zeroSlot };
}

function rankSeriesData(ranks, rankAxis) {
    return (ranks || []).map(value => {
        const rank = Number(value);
        return Number.isFinite(rank) && rank > 0 ? rank : rankAxis.zeroSlot;
    });
}

function rankDisplayValue(value, rankAxis) {
    return Number(value) === rankAxis.zeroSlot ? 0 : value;
}

function renderChart() {
    if (!currentChart) currentChart = echarts.init(document.getElementById('trendChart'));
    const yearData = YEARLY_DATA[currentYear];
    if (!yearData) return;
    const rankAxis = rankAxisFor(yearData.weekly_ranks);
    currentChart.setOption({
        tooltip: { trigger: 'axis', triggerOn: 'mousemove|click', axisPointer: { type: 'line', snap: true }, formatter: (params) => `<strong>${params[0].axisValue}</strong><br/>排名: ${Math.round(params[0].value)}位` },
        grid: { left: '8%', right: '8%', bottom: '12%', top: '8%', containLabel: true },
        xAxis: { type: 'category', data: WEEKS, name: '周次 (Week)', nameLocation: 'middle', nameGap: 40, axisLabel: { rotate: 45, interval: 5, fontSize: 10 } },
        yAxis: { type: 'value', name: '排名位置 (数值越小越靠前)', inverse: true, min: rankAxis.min, max: rankAxis.max },
        dataZoom: [{ type: 'slider', show: true, xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end, bottom: 5 }, { type: 'inside', xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end }],
        series: [{ type: 'line', data: yearData.weekly_ranks, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#ff9900' }, areaStyle: { opacity: 0.15, color: '#ff9900' }, itemStyle: { color: '#ff6600' }, label: { show: true, position: 'top', formatter: (p) => p.value <= 50 ? p.value : '', fontSize: 10 } }]
    }, true);
}

function renderComparisonChart() {
    if (!currentChart) currentChart = echarts.init(document.getElementById('trendChart'));
    const rankAxis = rankAxisFor(
        YEARLY_DATA['2024'].weekly_ranks,
        YEARLY_DATA['2025'].weekly_ranks,
        YEARLY_DATA['2026'].weekly_ranks
    );
    currentChart.setOption({
        tooltip: { trigger: 'axis', triggerOn: 'mousemove|click', axisPointer: { type: 'line', snap: true }, formatter: (params) => {
            let result = `<strong>${params[0].axisValue}</strong><br/>`;
            params.forEach(p => result += `${p.marker} ${p.seriesName}: ${Math.round(p.value)}位<br/>`);
            return result;
        } },
        legend: { data: ['2024年', '2025年', '2026年'], top: 0, right: 10, icon: 'circle' },
        grid: { left: '8%', right: '8%', bottom: '12%', top: '12%', containLabel: true },
        xAxis: { type: 'category', data: WEEKS, name: '周次 (Week)', nameLocation: 'middle', nameGap: 40, axisLabel: { rotate: 45, interval: 5, fontSize: 10 } },
        yAxis: { type: 'value', name: '排名位置', inverse: true, min: rankAxis.min, max: rankAxis.max },
        dataZoom: [{ type: 'slider', show: true, xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end, bottom: 5 }, { type: 'inside', xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end }],
        series: [
            { name: '2024年', type: 'line', data: YEARLY_DATA['2024'].weekly_ranks, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, color: '#94a3b8' }, areaStyle: { opacity: 0.08 } },
            { name: '2025年', type: 'line', data: YEARLY_DATA['2025'].weekly_ranks, smooth: true, symbol: 'diamond', symbolSize: 5, lineStyle: { width: 2, color: '#64748b' }, areaStyle: { opacity: 0.08 } },
            { name: '2026年', type: 'line', data: YEARLY_DATA['2026'].weekly_ranks, smooth: true, symbol: 'triangle', symbolSize: 6, lineStyle: { width: 2.5, color: '#ff9900' }, areaStyle: { opacity: 0.15 } }
        ]
    }, true);
}

function zoomChart(action) {
    if (action === 'in') { currentZoom.start = Math.min(currentZoom.start + 10, 90); currentZoom.end = Math.max(currentZoom.end - 10, 10); }
    else if (action === 'out') { currentZoom.start = Math.max(currentZoom.start - 10, 0); currentZoom.end = Math.min(currentZoom.end + 10, 100); }
    else if (action === 'reset') { currentZoom = { start: 0, end: 100 }; }
    if (currentYear === 'compare') renderComparisonChart(); else renderChart();
}

init();
