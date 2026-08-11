// Empty means same-origin requests. Nginx proxies /api/ to the backend.
const API_BASE = '';

const els = {
  site: document.querySelector('#siteSelect'),
  week: document.querySelector('#weekSelect'),
  category: document.querySelector('#categorySelect'),
  keyword: document.querySelector('#keywordInput'),
  keywordSearch: document.querySelector('#keywordSearchBtn'),
  keywordSuggestions: document.querySelector('#keywordSuggestions'),
  change: document.querySelector('#relevanceSelect'),
  rank: document.querySelector('#rankSelect'),
  volume: document.querySelector('#volumeSelect'),
  click: document.querySelector('#clickSelect'),
  conversion: document.querySelector('#conversionSelect'),
  apply: document.querySelector('#applyBtn'),
  reset: document.querySelector('#resetBtn'),
  tbody: document.querySelector('#tableBody'),
  summary: document.querySelector('#summaryText'),
  chartHint: document.querySelector('#chartHint'),
  dataUpdateTime: document.querySelector('#dataUpdateTime'),
  selectPage: document.querySelector('#selectPageCheckbox'),
  downloadSelected: document.querySelector('#downloadSelectedBtn'),
  pageInfo: document.querySelector('#pageInfo'),
  pageSelect: document.querySelector('#pageSelect'),
  prevPage: document.querySelector('#prevPageBtn'),
  nextPage: document.querySelector('#nextPageBtn'),
  pageSize: document.querySelector('#pageSizeSelect'),
  pageSizeInput: document.querySelector('#pageSizeInput'),
  keywordApp: document.querySelector('#keywordApp'),
  userCenter: document.querySelector('#userCenter'),
  navTabs: document.querySelectorAll('.nav-tab'),
  keywordProfileTabs: document.querySelectorAll('.keyword-profile-tab'),
};

const chart = echarts.init(document.querySelector('#trendChart'));
const sparkPopover = document.createElement('div');
sparkPopover.className = 'spark-popover';
document.body.appendChild(sparkPopover);
const sparkNodeTip = document.createElement('div');
sparkNodeTip.className = 'spark-node-tip';
document.body.appendChild(sparkNodeTip);
let sparkPopoverHideTimer = null;

sparkPopover.addEventListener('mouseenter', () => {
  clearTimeout(sparkPopoverHideTimer);
});

sparkPopover.addEventListener('mouseleave', () => {
  scheduleHideSparkPopover();
});

let state = {
  options: null,
  rows: [],
  selectedKeyword: '',
  selectedWeek: null,
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
  selectedKeywords: new Set(),
  navRank: 'all',
  keywordProfile: 'all',
  keywordSuggestions: [],
};

let multiSelectSearchTimer = null;

function fmtNumber(num) {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num || 0).toLocaleString('en-US');
}

function fmtPercent(num) {
  return `${Number(num || 0).toFixed(2).replace(/\.00$/, '')}%`;
}

function rankChangeHtml(change) {
  const status = change?.status || 'unknown';
  if (status === 'up') {
    return `<span class="rank-change up" title="上周排名 ${fmtNumber(change.previous_rank)}">↑ ${escapeHtml(change.label)}</span>`;
  }
  if (status === 'down') {
    return `<span class="rank-change down" title="上周排名 ${fmtNumber(change.previous_rank)}">↓ ${escapeHtml(change.label)}</span>`;
  }
  if (status === 'flat') {
    return `<span class="rank-change flat" title="上周排名 ${fmtNumber(change.previous_rank)}">→ 持平</span>`;
  }
  return `<span class="rank-change muted">${escapeHtml(change?.label || '暂无上周数据')}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API failed: ${path}`);
  return res.json();
}

function hideKeywordSuggestions() {
  if (!els.keywordSuggestions) return;
  els.keywordSuggestions.hidden = true;
}

function renderKeywordSuggestions(items) {
  if (!els.keywordSuggestions) return;
  state.keywordSuggestions = items || [];
  if (!state.keywordSuggestions.length) {
    els.keywordSuggestions.innerHTML = '<div class="keyword-suggestion-empty">暂无关键词建议</div>';
    els.keywordSuggestions.hidden = false;
    return;
  }
  els.keywordSuggestions.innerHTML = state.keywordSuggestions.map(item => `
    <button type="button" class="keyword-suggestion-item" data-keyword="${escapeHtml(item.keyword)}">
      <span class="suggestion-rank">#${fmtNumber(item.rank)}</span>
      <span class="suggestion-main">
        <strong>${escapeHtml(item.keyword)}</strong>
        <small>${escapeHtml(item.keyword_cn || item.category1 || '待翻译')}</small>
      </span>
      <span class="suggestion-share">${fmtPercent(item.click_share)}</span>
    </button>
  `).join('');
  els.keywordSuggestions.hidden = false;
}

async function loadKeywordSuggestions() {
  const params = new URLSearchParams({
    site: els.site.value || 'DE',
    week: els.week.value || state.options?.latest_week || '',
    category: els.category.value || 'all',
    base_rank: state.navRank || 'all',
    keyword_profile: state.keywordProfile || 'all',
    limit: '10',
  });
  const data = await getJson(`/api/keyword_suggestions?${params.toString()}`);
  renderKeywordSuggestions(data.items || []);
}

function setOptions(select, items, getValue, getLabel) {
  select.innerHTML = items.map(item => {
    const value = escapeHtml(getValue(item));
    const label = escapeHtml(getLabel(item));
    return `<option value="${value}">${label}</option>`;
  }).join('');
}

function siteFlag(code) {
  const flags = {
    DE: '🇩🇪',
    US: '🇺🇸',
    UK: '🇬🇧',
    GB: '🇬🇧',
    FR: '🇫🇷',
    IT: '🇮🇹',
    ES: '🇪🇸',
    NL: '🇳🇱',
    SE: '🇸🇪',
    PL: '🇵🇱',
    JP: '🇯🇵',
    CA: '🇨🇦',
    MX: '🇲🇽',
    BR: '🇧🇷',
    AU: '🇦🇺',
  };
  return flags[String(code || '').toUpperCase()] || '🌐';
}

function siteLabel(item) {
  const code = String(item.code || '').toUpperCase();
  return `${item.flag || siteFlag(code)} ${item.name || code}`.trim();
}

function getMultiValues(container) {
  const values = (container.dataset.values || 'all').split(',').filter(Boolean);
  return values.length ? values : ['all'];
}

function getMultiValueParam(container) {
  const values = getMultiValues(container);
  return values.includes('all') ? 'all' : values.join(',');
}

function setMultiValues(container, values) {
  const nextValues = !values || !values.length || values.includes('all') ? ['all'] : values;
  container.dataset.values = nextValues.join(',');
  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = nextValues.includes(input.value);
  });
  updateMultiButton(container);
}

function updateMultiButton(container) {
  const values = getMultiValues(container);
  const placeholder = container.dataset.placeholder || '全部';
  const button = container.querySelector('.multi-select-button');
  if (!button) return;
  if (values.includes('all')) {
    button.textContent = placeholder;
    return;
  }
  const selectedLabels = [...container.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.closest('label')?.querySelector('span')?.textContent?.trim() || input.value);
  button.textContent = selectedLabels.length <= 2
    ? selectedLabels.join('、')
    : `已选择 ${selectedLabels.length} 项`;
}

function setMultiOptions(container, items, getValue, getLabel) {
  const previous = getMultiValues(container);
  const validValues = new Set(items.map(item => String(getValue(item))));
  const selected = previous.filter(value => validValues.has(value));
  const nextSelected = selected.length ? selected : ['all'];
  container.dataset.values = nextSelected.includes('all') ? 'all' : nextSelected.join(',');
  container.innerHTML = `
    <button type="button" class="multi-select-button"></button>
    <div class="multi-select-menu">
      ${items.map(item => {
        const value = escapeHtml(getValue(item));
        const label = escapeHtml(getLabel(item));
        const checked = nextSelected.includes(getValue(item)) ? 'checked' : '';
        return `<label class="multi-option"><input type="checkbox" value="${value}" ${checked} /><span>${label}</span></label>`;
      }).join('')}
    </div>
  `;
  updateMultiButton(container);
}

function bindMultiSelect(container) {
  container.addEventListener('click', event => {
    event.stopPropagation();
    const button = event.target.closest('.multi-select-button');
    if (button) {
      document.querySelectorAll('.multi-select.open').forEach(item => {
        if (item !== container) item.classList.remove('open');
      });
      container.classList.toggle('open');
    }
  });

  container.addEventListener('change', event => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;
    const checkedValues = [...container.querySelectorAll('input[type="checkbox"]:checked')].map(item => item.value);
    if (input.value === 'all' || checkedValues.length === 0) {
      setMultiValues(container, ['all']);
    } else {
      setMultiValues(container, checkedValues.filter(value => value !== 'all'));
    }
    container.dispatchEvent(new CustomEvent('multi-change'));
  });

  container.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    container.dispatchEvent(new CustomEvent('multi-commit'));
  });
}

function buildPercentOptions(allLabel) {
  const options = [{ value: 'all', label: allLabel }];
  for (let start = 0; start < 100; start += 10) {
    const end = start + 10;
    options.push({ value: `${start}_${end}`, label: `${start}%-${end}%` });
  }
  return options;
}

function buildRankOptions() {
  const options = [{ value: 'all', label: '全部排名' }];
  for (let start = 1; start <= 25001; start += 5000) {
    const end = start + 4999;
    options.push({ value: `${start}_${end}`, label: `${fmtNumber(start)}-${fmtNumber(end)}` });
  }
  for (let start = 30001; start <= 90001; start += 10000) {
    const end = start + 9999;
    options.push({ value: `${start}_${end}`, label: `${fmtNumber(start)}-${fmtNumber(end)}` });
  }
  for (let start = 100001; start <= 450001; start += 50000) {
    const end = start + 49999;
    options.push({ value: `${start}_${end}`, label: `${fmtNumber(start)}-${fmtNumber(end)}` });
  }
  options.push({ value: 'gte_500001', label: '500,001以上' });
  return options;
}

function buildChangeOptions() {
  const options = [
    { value: 'all', label: '全部变化' },
    { value: 'flat', label: '持平' },
  ];
  for (const direction of ['up', 'down']) {
    const labelPrefix = direction === 'up' ? '提升' : '下降';
    for (let start = 1; start <= 9001; start += 1000) {
      const end = start + 999;
      options.push({ value: `${direction}_${start}_${end}`, label: `${labelPrefix} ${fmtNumber(start)}-${fmtNumber(end)}名` });
    }
    options.push({ value: `${direction}_gte_10001`, label: `${labelPrefix} 10,001名以上` });
  }
  return options;
}

function initFilterOptions() {
  setOptions(els.rank, buildRankOptions(), item => item.value, item => item.label);
  setMultiOptions(els.click, buildPercentOptions('全部点击份额'), item => item.value, item => item.label);
  setMultiOptions(els.conversion, buildPercentOptions('全部转化份额'), item => item.value, item => item.label);
  setOptions(els.change, buildChangeOptions(), item => item.value, item => item.label);
}

function clampPageSize(value) {
  return Math.min(Math.max(Number(value) || 25, 1), 100);
}

function resetToFirstPageAndLoad() {
  clearTimeout(multiSelectSearchTimer);
  multiSelectSearchTimer = null;
  state.page = 1;
  return loadKeywords();
}

function closeMultiSelectMenus() {
  document.querySelectorAll('.multi-select.open').forEach(item => item.classList.remove('open'));
}

function scheduleMultiSelectSearch() {
  clearTimeout(multiSelectSearchTimer);
  multiSelectSearchTimer = setTimeout(() => {
    multiSelectSearchTimer = null;
    closeMultiSelectMenus();
    state.page = 1;
    loadKeywords();
  }, 5000);
}

function commitMultiSelectSearch() {
  clearTimeout(multiSelectSearchTimer);
  multiSelectSearchTimer = null;
  closeMultiSelectMenus();
  resetToFirstPageAndLoad();
}

async function loadFilterOptions({ keepCategory = true } = {}) {
  const currentCategory = keepCategory ? els.category.value : '';
  const params = new URLSearchParams({
    site: els.site.value || 'DE',
    week: els.week.value || state.options?.latest_week || '',
    base_rank: state.navRank || 'all',
    category: currentCategory || '',
  });
  const data = await getJson(`/api/filter_options?${params.toString()}`);

  setOptions(
    els.category,
    [{ name: 'all', count: data.categories.reduce((sum, item) => sum + item.count, 0) }, ...data.categories],
    item => item.name,
    item => item.name === 'all' ? `全部类目 (${fmtNumber(item.count)})` : `${item.name} (${fmtNumber(item.count)})`,
  );

  if (data.selected_category && [...els.category.options].some(option => option.value === data.selected_category)) {
    els.category.value = data.selected_category;
  } else if (keepCategory && [...els.category.options].some(option => option.value === currentCategory)) {
    els.category.value = currentCategory;
  } else {
    els.category.value = data.default_category || 'all';
  }

  setOptions(els.rank, data.rank_options, item => item.value, item => item.label);
  setMultiOptions(els.click, data.click_options, item => item.value, item => item.label);
  setMultiOptions(els.conversion, data.conversion_options, item => item.value, item => item.label);
  setOptions(els.change, data.change_options, item => item.value, item => item.label);
}

function updateDataUpdateTime() {
  els.dataUpdateTime.textContent = state.options?.latest_data_update
    ? `数据更新时间：${state.options.latest_data_update}`
    : '';
}

async function loadSiteOptions(site) {
  const params = new URLSearchParams({ site: site || 'DE' });
  state.options = await getJson(`/api/options?${params.toString()}`);
  setOptions(els.week, state.options.weeks, item => item.id, item => item.label);
  els.week.value = state.options.latest_week || '';
  updateDataUpdateTime();
}

async function init() {
  initFilterOptions();
  state.options = await getJson('/api/options');
  setOptions(els.site, state.options.sites, item => item.code, siteLabel);
  setOptions(els.week, state.options.weeks, item => item.id, item => item.label);

  els.week.value = state.options.latest_week;
  els.dataUpdateTime.textContent = state.options.latest_data_update
    ? `数据更新时间：${state.options.latest_data_update}`
    : '';
  els.site.value = 'DE';
  els.week.value = state.options.latest_week || '';
  updateDataUpdateTime();
  await loadFilterOptions({ keepCategory: false });
  els.category.value = 'all';

  bindEvents();
  await loadKeywords();
}

function bindEvents() {
  els.apply.addEventListener('click', resetToFirstPageAndLoad);
  els.site.addEventListener('change', async () => {
    state.page = 1;
    state.selectedKeywords.clear();
    state.navRank = 'all';
    state.keywordProfile = 'all';
    els.keyword.value = '';
    els.rank.value = 'all';
    els.volume.value = 'all';
    setMultiValues(els.click, ['all']);
    setMultiValues(els.conversion, ['all']);
    els.change.value = 'all';
    els.keywordProfileTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.profile === 'all'));
    els.navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.rank === 'all'));
    hideKeywordSuggestions();
    await loadSiteOptions(els.site.value);
    await loadFilterOptions({ keepCategory: false });
    await loadKeywords();
  });
  els.reset.addEventListener('click', async () => {
    els.keyword.value = '';
    els.rank.value = 'all';
    els.volume.value = 'all';
    setMultiValues(els.click, ['all']);
    setMultiValues(els.conversion, ['all']);
    els.change.value = 'all';
    els.week.value = state.options.latest_week;
    state.navRank = 'all';
    state.keywordProfile = 'all';
    els.keywordProfileTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.profile === 'all'));
    els.navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.rank === 'all'));
    state.page = 1;
    await loadFilterOptions({ keepCategory: false });
    await loadKeywords();
  });
  els.week.addEventListener('change', async () => {
    state.page = 1;
    hideKeywordSuggestions();
    await loadFilterOptions({ keepCategory: false });
    await loadKeywords();
  });
  els.category.addEventListener('change', async () => {
    state.page = 1;
    hideKeywordSuggestions();
    await loadFilterOptions({ keepCategory: true });
    await loadKeywords();
  });
  els.rank.addEventListener('change', resetToFirstPageAndLoad);
  els.volume.addEventListener('change', resetToFirstPageAndLoad);
  bindMultiSelect(els.click);
  bindMultiSelect(els.conversion);
  els.click.addEventListener('multi-change', scheduleMultiSelectSearch);
  els.conversion.addEventListener('multi-change', scheduleMultiSelectSearch);
  els.click.addEventListener('multi-commit', commitMultiSelectSearch);
  els.conversion.addEventListener('multi-commit', commitMultiSelectSearch);
  els.change.addEventListener('change', resetToFirstPageAndLoad);
  els.keyword.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      hideKeywordSuggestions();
      resetToFirstPageAndLoad();
    }
  });
  els.keyword.addEventListener('focus', loadKeywordSuggestions);
  els.keyword.addEventListener('click', event => {
    event.stopPropagation();
    loadKeywordSuggestions();
  });
  els.keywordSuggestions.addEventListener('click', event => {
    event.stopPropagation();
    const button = event.target.closest('.keyword-suggestion-item');
    if (!button) return;
    els.keyword.value = button.dataset.keyword || '';
    hideKeywordSuggestions();
    els.keyword.focus();
  });
  els.keywordSearch.addEventListener('click', () => {
    hideKeywordSuggestions();
    resetToFirstPageAndLoad();
  });
  els.keywordProfileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.keywordProfileTabs.forEach(item => item.classList.toggle('active', item === tab));
      state.keywordProfile = tab.dataset.profile || 'all';
      state.page = 1;
      hideKeywordSuggestions();
      loadKeywords();
    });
  });
  els.prevPage.addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    loadKeywords();
  });
  els.nextPage.addEventListener('click', () => {
    if (state.page >= state.totalPages) return;
    state.page += 1;
    loadKeywords();
  });
  els.pageSelect.addEventListener('change', () => {
    state.page = Number(els.pageSelect.value) || 1;
    loadKeywords();
  });
  els.pageSize.addEventListener('change', () => {
    state.pageSize = clampPageSize(els.pageSize.value);
    els.pageSizeInput.value = String(state.pageSize);
    state.page = 1;
    loadKeywords();
  });
  els.pageSizeInput.addEventListener('change', () => {
    state.pageSize = clampPageSize(els.pageSizeInput.value);
    els.pageSizeInput.value = String(state.pageSize);
    els.pageSize.value = ['25', '50', '75', '100'].includes(String(state.pageSize)) ? String(state.pageSize) : '';
    state.page = 1;
    loadKeywords();
  });
  els.selectPage.addEventListener('change', () => {
    const checked = els.selectPage.checked;
    state.rows.forEach(row => {
      if (checked) {
        state.selectedKeywords.add(row.keyword);
      } else {
        state.selectedKeywords.delete(row.keyword);
      }
    });
    renderTable();
    updateSelectionControls();
  });
  els.downloadSelected.addEventListener('click', downloadSelectedKeywords);
  els.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchNav(tab));
  });
  document.addEventListener('scroll', hideSparkPopover, true);
  document.addEventListener('click', () => {
    if (multiSelectSearchTimer) {
      commitMultiSelectSearch();
    } else {
      closeMultiSelectMenus();
    }
    hideKeywordSuggestions();
  });
}

async function switchNav(tab) {
  els.navTabs.forEach(item => item.classList.toggle('active', item === tab));
  const view = tab.dataset.view || 'hot';
  if (view === 'user') {
    els.keywordApp.hidden = true;
    els.userCenter.hidden = false;
    return;
  }

  els.keywordApp.hidden = false;
  els.userCenter.hidden = true;
  state.navRank = tab.dataset.rank || 'all';
  state.page = 1;
  hideKeywordSuggestions();
  await loadFilterOptions({ keepCategory: false });
  els.category.value = 'all';
  await loadKeywords();
}

async function loadKeywords() {
  els.summary.textContent = '正在加载...';
  hideSparkPopover();
  const params = new URLSearchParams({
    site: els.site.value || 'DE',
    week: els.week.value,
    category: els.category.value,
    q: els.keyword.value.trim(),
    base_rank: state.navRank || 'all',
    keyword_profile: state.keywordProfile || 'all',
    rank: els.rank.value || 'all',
    volume: els.volume.value || 'all',
    click: getMultiValueParam(els.click),
    conversion: getMultiValueParam(els.conversion),
    change: els.change.value,
    page: String(state.page),
    page_size: String(state.pageSize),
  });
  const data = await getJson(`/api/keywords?${params.toString()}`);
  state.selectedWeek = data.week;
  state.rows = data.items;
  const currentPageKeywords = new Set(state.rows.map(row => row.keyword));
  state.selectedKeywords = new Set([...state.selectedKeywords].filter(keyword => currentPageKeywords.has(keyword)));
  state.total = data.total || 0;
  state.totalPages = Math.max(data.total_pages || 1, 1);
  state.page = Math.min(data.page || 1, state.totalPages);
  state.pageSize = data.page_size || state.pageSize;
  renderTable();
  renderPagination();
  if (state.rows[0]) {
    await selectKeyword(state.rows[0].keyword);
  } else {
    renderEmptyChart();
  }
}

function trendValues(points) {
  return (points || []).filter(point => point.value !== null && point.value !== undefined);
}

function chartValue(point) {
  if (point?.value === null || point?.value === undefined || point?.value === '') return 0;
  const value = Number(point.value);
  return Number.isFinite(value) ? value : 0;
}

function chartValues(points) {
  return (points || []).map(point => ({ ...point, value: chartValue(point) }));
}

function positiveRankValues(points) {
  return chartValues(points).map(point => Number(point.value)).filter(value => value > 0);
}

function rankStepFor(maxRank) {
  if (maxRank <= 100) return 10;
  if (maxRank <= 1000) return 100;
  if (maxRank <= 10000) return 1000;
  return 10000;
}

function zeroRankSlot(maxRank) {
  const safeMax = Math.max(Number(maxRank) || 1, 1);
  const step = rankStepFor(safeMax);
  return Math.ceil(safeMax / step) * step + step;
}

function rankPlotValue(point, zeroSlot) {
  const value = chartValue(point);
  return value === 0 ? zeroSlot : value;
}

function formatRankAxis(value, zeroSlot) {
  return Number(value) === zeroSlot ? '0' : fmtNumber(value);
}

function yearColor(year, fallbackIndex = 0) {
  const fixed = {
    2024: '#94a3b8',
    2025: '#2563eb',
    2026: '#16a34a',
  };
  const palette = ['#ff5b2e', '#9333ea', '#eab308', '#0f766e'];
  return fixed[Number(year)] || palette[fallbackIndex % palette.length];
}

function normalizeTrendSeries(series, fallbackPoints = []) {
  if (Array.isArray(series) && series.length) return series;
  if (Array.isArray(fallbackPoints) && fallbackPoints.length) {
    const year = fallbackPoints.find(point => point.year)?.year || '';
    return [{ year, name: String(year), points: fallbackPoints }];
  }
  return [];
}

function smoothPathFromPoints(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const slopeAt = idx => {
    const current = points[idx];
    const previous = points[Math.max(0, idx - 1)];
    const next = points[Math.min(points.length - 1, idx + 1)];
    const dx = next.x - previous.x;
    if (!dx) return 0;
    return (next.y - previous.y) / dx;
  };

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let idx = 1; idx < points.length; idx += 1) {
    const previous = points[idx - 1];
    const current = points[idx];
    const dx = current.x - previous.x;
    const previousSlope = slopeAt(idx - 1);
    const currentSlope = slopeAt(idx);
    const minY = Math.min(previous.y, current.y);
    const maxY = Math.max(previous.y, current.y);
    const cp1 = {
      x: previous.x + dx / 3,
      y: clamp(previous.y + previousSlope * dx / 3, minY, maxY),
    };
    const cp2 = {
      x: current.x - dx / 3,
      y: clamp(current.y - currentSlope * dx / 3, minY, maxY),
    };
    path += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }
  return path;
}

function sparkPointTitle(point, year) {
  const week = point.short_label || `周${point.week || '-'}`;
  const date = point.date || '-';
  return `年份：${year || point.year || '-'}\n周：${week}\n报告日期：${date}\n搜索排名：${fmtNumber(point.value)}`;
}

function sparklineSvg(series, options = {}) {
  const width = options.width || 150;
  const height = options.height || 48;
  const padding = options.padding ?? 3;
  const chartSeries = normalizeTrendSeries(series, options.fallbackPoints);
  const allPoints = chartSeries.flatMap(item => item.points || []);
  const plotted = chartSeries.flatMap(item => chartValues(item.points));
  const yearWeekCount = Math.max(53, ...chartSeries.map(item => item.points?.length || 0));

  if (!plotted.length) {
    const axisY = height - padding;
    return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path class="empty-line" d="M 0 ${height / 2} H ${width}" /><path class="spark-x-axis" d="M ${padding} ${axisY.toFixed(2)} H ${width - padding}" /></svg>`;
  }

  const positiveRanks = positiveRankValues(allPoints);
  const minRank = positiveRanks.length ? Math.min(...positiveRanks) : 1;
  const maxRank = positiveRanks.length ? Math.max(...positiveRanks) : 1;
  const zeroSlot = zeroRankSlot(maxRank);
  const rankSpan = Math.max(zeroSlot - minRank, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const xFor = week => padding + ((week - 1) / Math.max(yearWeekCount - 1, 1)) * usableWidth;
  const yFor = value => padding + ((Number(value) - minRank) / rankSpan) * usableHeight;
  const hitByWeek = new Map();
  const axisY = height - padding;
  const xAxis = `<path class="spark-x-axis" d="M ${padding} ${axisY.toFixed(2)} H ${width - padding}" />`;

  const lines = chartSeries.map((item, idx) => {
    const seriesPoints = chartValues(item.points);
    const svgPoints = seriesPoints.map(point => ({
      x: xFor(point.week),
      y: yFor(rankPlotValue(point, zeroSlot)),
    }));
    const path = smoothPathFromPoints(svgPoints);
    if (!path) return '';
    const color = yearColor(item.year, idx);
    const dots = options.dots
      ? seriesPoints.map(point => {
        const titleText = sparkPointTitle(point, item.year);
        if (options.showTitles) {
          const key = String(point.week);
          const items = hitByWeek.get(key) || [];
          items.push(titleText);
          hitByWeek.set(key, items);
        }
        const title = options.showTitles ? `<title>${escapeHtml(titleText)}</title>` : '';
        const dataTitle = options.showTitles ? ` data-title="${escapeHtml(titleText)}"` : '';
        return `<circle cx="${xFor(point.week).toFixed(2)}" cy="${yFor(rankPlotValue(point, zeroSlot)).toFixed(2)}" r="2.8" style="fill:${color}"${dataTitle}>${title}</circle>`;
      }).join('')
      : '';
    return `<path d="${path}" style="stroke:${color}" />${dots}`;
  }).join('');
  const hitWidth = options.hitWidth || Math.max(10, Math.min(26, usableWidth / Math.max(yearWeekCount - 1, 1)));
  const hitZones = options.showTitles
    ? [...hitByWeek.entries()].map(([week, titles]) => {
      const x = xFor(Number(week));
      const titleText = titles.join('\n\n');
      return `<rect class="spark-hit-zone" x="${(x - hitWidth / 2).toFixed(2)}" y="0" width="${hitWidth.toFixed(2)}" height="${height}" fill="transparent" opacity="0" style="pointer-events:all;cursor:crosshair" data-title="${escapeHtml(titleText)}" />`;
    }).join('')
    : '';

  return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${xAxis}${lines}${hitZones}</svg>`;
}

function renderTable() {
  const years = [...new Set((state.options?.weeks || []).map(week => week.year))].sort().join(' / ');
  const start = state.total ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = Math.min(state.page * state.pageSize, state.total);
  els.summary.textContent = `当前结果 ${fmtNumber(state.total)} 条 · 当前 ${fmtNumber(start)}-${fmtNumber(end)} · 可对比年份 ${years || '-'}`;
  if (!state.rows.length) {
    els.tbody.innerHTML = '<tr><td class="empty-keywords" colspan="9">无关键词</td></tr>';
    updateSelectionControls();
    return;
  }
  els.tbody.innerHTML = state.rows.map((row, idx) => `
    <tr data-row-index="${idx}" class="${row.keyword === state.selectedKeyword ? 'selected' : ''}">
      <td><input class="row-check keyword-check" type="checkbox" data-keyword="${escapeHtml(row.keyword)}" ${state.selectedKeywords.has(row.keyword) ? 'checked' : ''} /></td>
      <td>${start + idx}</td>
      <td class="kw"><strong>${escapeHtml(row.keyword)}</strong><span>${escapeHtml(row.keyword_cn || '待翻译')}</span></td>
      <td class="trend-cell">
        <div class="spark-wrap" data-row-index="${idx}" aria-label="排名趋势">
          ${sparklineSvg(row.rank_trend_series, { fallbackPoints: row.rank_trend })}
        </div>
      </td>
      <td class="rank-cell"><strong>${fmtNumber(row.rank)}</strong>${rankChangeHtml(row.rank_change)}</td>
      <td>${row.weekly_volume ? fmtNumber(row.weekly_volume) : '-'}</td>
      <td>${fmtPercent(row.click_share)}</td>
      <td>${fmtPercent(row.conversion_share)}</td>
      <td class="cat">${escapeHtml(row.category1)}<span>${escapeHtml(row.category2 || '')}</span></td>
    </tr>
  `).join('');

  els.tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', event => {
      if (event.target.closest('.spark-wrap')) return;
      const row = state.rows[Number(tr.dataset.rowIndex)];
      if (row) selectKeyword(row.keyword);
    });
  });

  els.tbody.querySelectorAll('.keyword-check').forEach(input => {
    input.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('change', () => {
      if (input.checked) {
        state.selectedKeywords.add(input.dataset.keyword);
      } else {
        state.selectedKeywords.delete(input.dataset.keyword);
      }
      updateSelectionControls();
    });
  });

  els.tbody.querySelectorAll('.spark-wrap').forEach(wrap => {
    wrap.addEventListener('mouseenter', event => {
      clearTimeout(sparkPopoverHideTimer);
      const row = state.rows[Number(wrap.dataset.rowIndex)];
      if (row) showSparkPopover(row, wrap, event);
    });
    wrap.addEventListener('mouseleave', scheduleHideSparkPopover);
    wrap.addEventListener('click', event => {
      event.stopPropagation();
      const row = state.rows[Number(wrap.dataset.rowIndex)];
      if (row) selectKeyword(row.keyword);
    });
  });
  updateSelectionControls();
}

function updateSelectionControls() {
  const pageKeywords = state.rows.map(row => row.keyword);
  const selectedOnPage = pageKeywords.filter(keyword => state.selectedKeywords.has(keyword)).length;
  els.selectPage.checked = pageKeywords.length > 0 && selectedOnPage === pageKeywords.length;
  els.selectPage.indeterminate = selectedOnPage > 0 && selectedOnPage < pageKeywords.length;
  els.downloadSelected.hidden = state.selectedKeywords.size === 0;
  els.downloadSelected.textContent = `下载选中 (${state.selectedKeywords.size})`;
}

function downloadSelectedKeywords() {
  const selectedRows = state.rows.filter(row => state.selectedKeywords.has(row.keyword));
  if (!selectedRows.length) return;
  const headers = ['关键词', '中文翻译', '关键词排名', '点击份额', '转化份额', '所属类目'];
  const lines = [
    headers.join(','),
    ...selectedRows.map(row => [
      row.keyword,
      row.keyword_cn || '',
      row.rank,
      row.click_share,
      row.conversion_share,
      row.category1,
    ].map(csvCell).join(',')),
  ];
  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `selected_keywords_page_${state.page}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function renderPagination() {
  const totalPages = Math.max(state.totalPages || 1, 1);
  els.pageInfo.textContent = `第 ${fmtNumber(state.page)} / ${fmtNumber(totalPages)} 页`;
  els.pageSelect.innerHTML = Array.from({ length: totalPages }, (_, idx) => {
    const page = idx + 1;
    return `<option value="${page}" ${page === state.page ? 'selected' : ''}>第 ${fmtNumber(page)} 页</option>`;
  }).join('');
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
  els.pageSize.value = ['25', '50', '75', '100'].includes(String(state.pageSize)) ? String(state.pageSize) : '';
  els.pageSizeInput.value = String(state.pageSize);
}

function showSparkPopover(row, anchorEl, event) {
  const series = normalizeTrendSeries(row.rank_trend_series, row.rank_trend);

  sparkPopover.innerHTML = `
    <div class="spark-pop-title">
      <strong>${escapeHtml(row.keyword)}</strong>
    </div>
    <div class="spark-pop-chart">
      ${sparklineSvg(series, { width: 360, height: 256, padding: 18, dots: true, showTitles: true })}
    </div>
  `;
  sparkPopover.classList.add('visible');
  bindSparkNodeTooltips();
  positionSparkPopover(anchorEl, event);
}

function bindSparkNodeTooltips() {
  sparkPopover.querySelectorAll('.spark-pop-chart [data-title]').forEach(node => {
    node.addEventListener('mouseenter', event => showSparkNodeTip(event, node.dataset.title));
    node.addEventListener('mousemove', event => positionSparkNodeTip(event));
    node.addEventListener('mouseleave', hideSparkNodeTip);
  });
}

function showSparkNodeTip(event, text) {
  sparkNodeTip.textContent = text || '';
  sparkNodeTip.classList.add('visible');
  positionSparkNodeTip(event);
}

function positionSparkNodeTip(event) {
  if (!sparkNodeTip.classList.contains('visible')) return;
  const margin = 12;
  const rect = sparkNodeTip.getBoundingClientRect();
  let left = event.clientX + margin;
  let top = event.clientY + margin;
  if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - margin;
  if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - margin;
  sparkNodeTip.style.left = `${Math.max(8, left)}px`;
  sparkNodeTip.style.top = `${Math.max(8, top)}px`;
}

function hideSparkNodeTip() {
  sparkNodeTip.classList.remove('visible');
}

function positionSparkPopover(anchorEl, event) {
  if (!sparkPopover.classList.contains('visible')) return;
  const margin = 6;
  const rect = sparkPopover.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  const cursorX = event?.clientX ?? anchorRect.right;
  const cursorY = event?.clientY ?? (anchorRect.top + anchorRect.height / 2);
  let left = cursorX + margin;
  let top = cursorY - 18;
  if (left + rect.width > window.innerWidth - 8) left = cursorX - rect.width - margin;
  if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
  sparkPopover.style.left = `${Math.max(8, left)}px`;
  sparkPopover.style.top = `${Math.max(8, top)}px`;
}

function hideSparkPopover() {
  clearTimeout(sparkPopoverHideTimer);
  sparkPopover.classList.remove('visible');
  hideSparkNodeTip();
}

function scheduleHideSparkPopover() {
  clearTimeout(sparkPopoverHideTimer);
  sparkPopoverHideTimer = setTimeout(() => {
    sparkPopover.classList.remove('visible');
    hideSparkNodeTip();
  }, 260);
}

async function selectKeyword(keyword) {
  state.selectedKeyword = keyword;
  els.tbody.querySelectorAll('tr').forEach(tr => {
    const row = state.rows[Number(tr.dataset.rowIndex)];
    tr.classList.toggle('selected', row?.keyword === keyword);
  });
  els.chartHint.textContent = keyword;
  const params = new URLSearchParams({
    site: els.site.value || 'DE',
    keyword,
    category: els.category.value,
    week: els.week.value,
    metric: 'rank',
  });
  const data = await getJson(`/api/trend?${params.toString()}`);
  renderChart(data.series || [], data.points || [], keyword, data.year);
}

function renderChart(series, fallbackPoints, keyword, selectedYear) {
  const chartSeries = series.length
    ? series
    : [{ year: selectedYear, name: String(selectedYear || ''), points: fallbackPoints || [] }];
  const allPoints = chartSeries.flatMap(item => item.points || []);
  const plotted = chartValues(allPoints);
  if (!plotted.length) {
    renderEmptyChart();
    return;
  }
  const values = positiveRankValues(allPoints);
  const minRank = values.length ? Math.min(...values) : 1;
  const maxRank = values.length ? Math.max(...values) : 1;
  const zeroSlot = zeroRankSlot(maxRank);
  const weekCount = Math.max(53, ...chartSeries.map(item => item.points?.length || 0));
  const xLabels = Array.from({ length: weekCount }, (_, idx) => `周${idx + 1}`);
  const colors = chartSeries.map((item, idx) => yearColor(item.year, idx));

  chart.setOption({
    color: colors,
    legend: {
      top: 4,
      right: 16,
      itemWidth: 18,
      itemHeight: 10,
      textStyle: { color: '#475569' },
    },
    grid: { left: 58, right: 26, top: 56, bottom: 42 },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      axisPointer: {
        type: 'line',
        snap: true,
      },
      formatter(params) {
        const dataIndex = params[0]?.dataIndex ?? 0;
        const weekLabel = xLabels[dataIndex] || '';
        const lines = [`${escapeHtml(keyword)} · ${weekLabel}`];
        for (const param of params) {
          const yearSeries = chartSeries.find(item => String(item.year) === String(param.seriesName));
          const point = yearSeries?.points?.[dataIndex];
          const dateText = point?.date ? `（${escapeHtml(point.date)}）` : '';
          const value = chartValue(point);
          if (value !== null) {
            lines.push(`${param.marker}${escapeHtml(param.seriesName)}：排名 ${fmtNumber(value)} ${dateText}`);
          }
        }
        return lines.join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      boundaryGap: false,
      axisLabel: { interval: 3 },
    },
    yAxis: {
      type: 'value',
      inverse: true,
      name: '搜索频率排名',
      min: minRank,
      max: zeroSlot,
      axisLabel: {
        formatter: value => formatRankAxis(value, zeroSlot),
      },
    },
    series: chartSeries.map((item, idx) => ({
      name: String(item.year || item.name || ''),
      type: 'line',
      smooth: true,
      smoothMonotone: 'x',
      connectNulls: false,
      symbolSize: 8,
      lineStyle: { width: 3, color: yearColor(item.year, idx) },
      itemStyle: { color: yearColor(item.year, idx) },
      data: xLabels.map((_, pointIndex) => rankPlotValue(item.points?.[pointIndex], zeroSlot)),
    })),
  }, true);
}

function renderEmptyChart() {
  chart.setOption({
    title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#94a3b8', fontSize: 14 } },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [],
  }, true);
}

window.addEventListener('resize', () => chart.resize());

init().catch(err => {
  console.error(err);
  els.summary.textContent = '加载失败，请确认后端服务已启动';
});
