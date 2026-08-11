#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从本地CSV文件生成亚马逊ABA关键词趋势看板
使用标准csv模块读取，避免pandas解析问题
"""

import csv
import json
import os
import re
from datetime import datetime
import random

# ========== 配置 ==========
# Resolve files from the project directory instead of a hard-coded local path.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_CANDIDATES = [
    os.path.join(BASE_DIR, "20260603_215741_DE__20260603_215435.csv"),
    os.path.join(BASE_DIR, "20260603_215741_DE__20260603_215435.xlsx"),
]
CSV_FILE_PATH = next((path for path in CSV_CANDIDATES if os.path.exists(path)), CSV_CANDIDATES[0])
STOPWORDS_FILE_PATH = os.path.join(BASE_DIR, "知名品牌名筛选_停用词.xlsx")
STOPWORDS_SHEET_NAME = "筛选结果"

# Output directory.
OUTPUT_DIR = os.path.join(BASE_DIR, "aba_dashboard")
OUTPUT_HTML = os.path.join(OUTPUT_DIR, "index.html")
OUTPUT_JS = os.path.join(OUTPUT_DIR, "script.js")
OUTPUT_CSS = os.path.join(OUTPUT_DIR, "style.css")

print("=" * 60)
print("亚马逊ABA关键词趋势看板生成器")
print("=" * 60)

# ========== 1. 检查文件是否存在 ==========
print(f"\n[INFO] 读取数据文件: {CSV_FILE_PATH}")

if not os.path.exists(CSV_FILE_PATH):
    print(f"[ERROR] 文件不存在: {CSV_FILE_PATH}")
    print("已尝试以下位置:")
    for candidate in CSV_CANDIDATES:
        print(f"   - {candidate}")
    exit(1)

if not os.path.exists(STOPWORDS_FILE_PATH):
    print(f"[WARN] 停用词文件不存在，将不做停用词剔除: {STOPWORDS_FILE_PATH}")


# ========== 2. 使用csv/Excel模块读取文件 ==========
def is_excel_file(file_path):
    """判断文件内容是否为xlsx格式，即使扩展名被改成.csv也能识别。"""
    try:
        with open(file_path, "rb") as f:
            return f.read(4) == b"PK\x03\x04"
    except OSError:
        return False


def read_excel_as_rows(file_path):
    """读取Excel内容，并转换成与csv.reader一致的headers/data_rows结构。"""
    try:
        import pandas as pd

        print("   检测到Excel文件内容，按xlsx读取")
        xls = pd.ExcelFile(file_path)
        sheet_name = xls.sheet_names[0]
        df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None, dtype=object)

        headers = None
        header_row_idx = None
        for idx, row in df_raw.iterrows():
            values = ["" if pd.isna(value) else str(value).strip() for value in row.tolist()]
            if values and ("搜索频率排名" in values[0] or values[0] == "搜索频率排名"):
                headers = values
                header_row_idx = idx
                break

        if headers is None:
            print("   Excel中未找到表头：搜索频率排名")
            return None, [], None

        data_rows = []
        for _, row in df_raw.iloc[header_row_idx + 1:].iterrows():
            values = []
            for value in row.tolist():
                if pd.isna(value):
                    values.append("")
                elif hasattr(value, "strftime"):
                    values.append(value.strftime("%Y-%m-%d"))
                else:
                    values.append(str(value).strip())

            if len(values) < 2 or not values[0]:
                continue
            if len(values) < len(headers):
                values.extend([""] * (len(headers) - len(values)))
            elif len(values) > len(headers):
                values = values[:len(headers)]
            data_rows.append(values)

        print(f"   找到工作表: {sheet_name}")
        print(f"   找到表头，共 {len(headers)} 列")
        print(f"   [OK] 成功读取 {len(data_rows)} 行数据")
        return headers, data_rows, "xlsx"
    except Exception as e:
        print(f"   Excel读取失败: {e}")
        return None, [], None


def read_csv_robust(file_path):
    """健壮的CSV读取函数"""
    if is_excel_file(file_path):
        return read_excel_as_rows(file_path)

    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']

    for encoding in encodings:
        data_rows = []
        headers = None
        try:
            print(f"   尝试编码: {encoding}")
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                reader = csv.reader(f)

                # 读取第一行，检测分隔符
                first_row = next(reader)
                if len(first_row) == 1 and ';' in first_row[0]:
                    # 重新用分号分隔
                    f.seek(0)
                    reader = csv.reader(f, delimiter=';')
                    first_row = next(reader)

                # 查找真正的表头
                for row in reader:
                    if not row or len(row) < 2:
                        continue
                    # 跳过报告范围行
                    if row[0].startswith('报告范围'):
                        continue
                    # 找到表头
                    if '搜索频率排名' in row[0] or row[0] == '搜索频率排名':
                        headers = row
                        print(f"   找到表头，共 {len(headers)} 列")
                        break

                # 读取数据行
                for row in reader:
                    if not row or len(row) < 2:
                        continue
                    if row[0].startswith('报告范围'):
                        continue
                    # 确保列数一致
                    if headers and len(row) >= 2:
                        if len(row) < len(headers):
                            row.extend([''] * (len(headers) - len(row)))
                        elif len(row) > len(headers):
                            row = row[:len(headers)]
                        data_rows.append(row)

                if len(data_rows) > 0:
                    print(f"   [OK] 成功读取 {len(data_rows)} 行数据")
                    return headers, data_rows, encoding

        except Exception as e:
            print(f"   编码 {encoding} 失败: {e}")
            continue

    return None, [], None


headers, data_rows, used_encoding = read_csv_robust(CSV_FILE_PATH)

if headers is None:
    print("[ERROR] 无法读取数据文件")
    exit(1)

print(f"\n[OK] 读取成功！共 {len(data_rows)} 行数据")
print(f"   使用编码: {used_encoding}")
print(f"   列名: {headers[:5]}...")

# ========== 3. 识别列索引 ==========
rank_idx = None
keyword_idx = None
brand_indices = []
category_indices = []

for idx, col in enumerate(headers):
    col_lower = str(col).lower()
    if '搜索频率排名' in col_lower or col_lower == '搜索频率排名':
        rank_idx = idx
    elif '搜索词' in col_lower or col_lower == '搜索词':
        keyword_idx = idx
    elif '品牌' in col_lower and '#1' in col:
        brand_indices.append(idx)
    elif '类别' in col_lower and '#1' in col:
        category_indices.append(idx)

# 默认使用前两列
if rank_idx is None:
    rank_idx = 0
if keyword_idx is None:
    keyword_idx = 1

print(f"\n[INFO] 识别结果:")
print(f"   排名列: 第{rank_idx}列 ({headers[rank_idx]})")
print(f"   关键词列: 第{keyword_idx}列 ({headers[keyword_idx]})")
print(f"   品牌列: {[headers[i] for i in brand_indices[:3]]}")
print(f"   类别列: {[headers[i] for i in category_indices[:3]]}")


# ========== 4. 提取TOP关键词数据 ==========
def clean_keyword(keyword):
    """清理关键词"""
    if not keyword:
        return None
    keyword = str(keyword).strip()
    if len(keyword) < 2:
        return None
    # 过滤无效字符
    if re.match(r'^[\d\s]+$', keyword):
        return None
    return keyword


def normalize_for_stopword_match(text):
    """标准化文本，供停用词整词匹配使用。"""
    text = "" if text is None else str(text).strip().lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[®™©.,:;!?'\"/\\|_+*#()\[\]{}<>~`^=]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_stopwords(file_path):
    """从停用词Excel读取所有需要剔除的搜索词。"""
    if not os.path.exists(file_path):
        return []

    try:
        import pandas as pd

        xls = pd.ExcelFile(file_path)
        sheet_name = STOPWORDS_SHEET_NAME if STOPWORDS_SHEET_NAME in xls.sheet_names else xls.sheet_names[0]
        df = pd.read_excel(file_path, sheet_name=sheet_name)

        stopwords = set()
        for col in df.columns:
            for value in df[col].dropna():
                term = normalize_for_stopword_match(value)
                if term:
                    stopwords.add(term)

        return sorted(stopwords, key=len, reverse=True)
    except Exception as exc:
        print(f"[WARN] 读取停用词失败，将不做停用词剔除: {exc}")
        return []


STOPWORDS = load_stopwords(STOPWORDS_FILE_PATH)
STOPWORD_TOKEN_SETS = [(term, set(term.split())) for term in STOPWORDS]
print(f"\n[INFO] 停用词加载完成: {len(STOPWORDS)} 个")


def keyword_contains_stopword(keyword):
    """判断搜索词是否包含停用词。使用整词匹配，避免误删单词片段。"""
    normalized_keyword = normalize_for_stopword_match(keyword)
    if not normalized_keyword:
        return False, None

    keyword_tokens = set(normalized_keyword.split())
    for stopword, stopword_tokens in STOPWORD_TOKEN_SETS:
        if stopword == normalized_keyword or stopword_tokens.issubset(keyword_tokens):
            return True, stopword

    return False, None


def extract_brand(row):
    """提取Top品牌"""
    for idx in brand_indices[:3]:
        if idx < len(row):
            val = row[idx].strip()
            if val and val != 'nan' and len(val) > 1:
                return val[:25]
    return "其他"


def extract_category(row):
    """提取Top类目"""
    for idx in category_indices[:3]:
        if idx < len(row):
            val = row[idx].strip()
            if val and val != 'nan' and len(val) > 1:
                return val[:25]
    return "其他"


keywords_data = []
seen = set()
filtered_stopword_count = 0
filtered_stopword_examples = []

print(f"\n[INFO] 正在提取关键词数据...")

for row in data_rows:
    if len(row) <= max(rank_idx, keyword_idx):
        continue

    keyword = row[keyword_idx] if keyword_idx < len(row) else ''
    keyword = clean_keyword(keyword)
    if not keyword or keyword in seen:
        continue

    has_stopword, matched_stopword = keyword_contains_stopword(keyword)
    if has_stopword:
        filtered_stopword_count += 1
        if len(filtered_stopword_examples) < 10:
            filtered_stopword_examples.append(f"{keyword} -> {matched_stopword}")
        seen.add(keyword)
        continue

    # 获取排名
    rank_str = row[rank_idx] if rank_idx < len(row) else ''
    try:
        rank = int(float(rank_str))
    except:
        rank = len(keywords_data) + 1

    brand = extract_brand(row)
    category = extract_category(row)

    keywords_data.append({
        'rank': rank,
        'keyword': keyword,
        'brand': brand,
        'category_raw': category
    })
    seen.add(keyword)

    if len(keywords_data) >= 150:
        break

print(f"[INFO] 已剔除包含停用词的关键词行: {filtered_stopword_count}")
if filtered_stopword_examples:
    print("   剔除示例:")
    for example in filtered_stopword_examples:
        print(f"   - {example}")

# 按排名排序取前50
keywords_data.sort(key=lambda x: x['rank'])
top_50 = keywords_data[:50]

print(f"[OK] 提取 TOP 50 关键词完成")

# 显示前10个关键词
print(f"\n[INFO] TOP 10 关键词:")
for i, item in enumerate(top_50[:10]):
    print(f"   {i + 1}. {item['keyword']} (排名: {item['rank']}, 品牌: {item['brand']})")


# ========== 5. 关键词智能分类 ==========
def auto_categorize(keyword):
    """根据关键词内容自动分类"""
    kw_lower = keyword.lower()

    # 服装服饰类
    clothing_keywords = ['kleid', 'damen', 'herren', 'bikini', 'badeanzug', 'sandalen', 'sonnenbrille',
                         't shirt', 'shirt', 'jacke', 'hose', 'schuhe', 'socken', 'mütze', 'hoodie',
                         'sommerkleid', 'kurze hose', 'badehose', 'birkenstock']
    # 电子产品类
    electronics_keywords = ['klimaanlage', 'ventilator', 'kindle', 'power bank', 'iphone', 'handy',
                            'kopfhörer', 'ladegerät', 'tablet', 'laptop', 'fernseher', 'fitbit',
                            'mobile klimaanlage', 'eiswürfelmaschine']
    # 家居用品类
    home_keywords = ['fliegengitter', 'musselin', 'decke', 'sonnenschirm', 'sonnensegel', 'kühlmatte',
                     'planschbecken', 'garten', 'möbel', 'lampe', 'kühlmatte hund']
    # 运动户外类
    sports_keywords = ['pool', 'wasserpistole', 'panini', 'fitness', 'yoga', 'lauf', 'fahrrad',
                       'camping', 'wandern', 'schwimmen', 'tennis']
    # 玩具游戏类
    toys_keywords = ['lol', 'spiderman', 'pokemon', 'spielzeug', 'puppe', 'lego', 'actionfigur',
                     'brettspiel', 'spider', 'dutton', 'panini wm']
    # 图书类
    books_keywords = ['off campus', 'the boys', 'euphoria', 'buch', 'roman', 'comic', 'manga', 'from']

    for kw in clothing_keywords:
        if kw in kw_lower:
            return 'clothing'
    for kw in electronics_keywords:
        if kw in kw_lower:
            return 'electronics'
    for kw in home_keywords:
        if kw in kw_lower:
            return 'home'
    for kw in sports_keywords:
        if kw in kw_lower:
            return 'sports'
    for kw in toys_keywords:
        if kw in kw_lower:
            return 'toys'
    for kw in books_keywords:
        if kw in kw_lower:
            return 'books'

    return 'other'


# 分类名称和图标
category_names = {
    'clothing': '👕 服装服饰',
    'electronics': '📱 电子产品',
    'home': '🏠 家居用品',
    'sports': '🏃 运动户外',
    'toys': '🎮 玩具游戏',
    'books': '📚 图书音像',
    'other': '📌 其他'
}

category_icons = {
    'clothing': '👕',
    'electronics': '📱',
    'home': '🏠',
    'sports': '🏃',
    'toys': '🎮',
    'books': '📚',
    'other': '📌'
}

# 为每个关键词添加分类
print(f"\n[INFO] 正在进行关键词分类...")

for item in top_50:
    cat = auto_categorize(item['keyword'])
    item['category_key'] = cat
    item['category'] = category_names[cat]
    item['category_icon'] = category_icons[cat]
    # 模拟环比变化
    change = random.randint(-30, 30)
    item['trend'] = f"{'+' if change >= 0 else ''}{change}%"
    item['prevRank'] = max(1, item['rank'] + random.randint(-3, 3))

# 统计分类分布
cat_stats = {}
for item in top_50:
    cat = item['category_key']
    cat_stats[cat] = cat_stats.get(cat, 0) + 1

print(f"\n[INFO] 分类统计:")
for cat, count in sorted(cat_stats.items(), key=lambda x: -x[1]):
    category_label = category_names[cat].split(" ", 1)[-1]
    print(f"   {cat} ({category_label}): {count}个")

# ========== 6. 生成52周模拟趋势数据 ==========
weeks = [f"W{i + 1}" for i in range(52)]


def generate_weekly_trend(base_rank=25, year=2026):
    """生成52周趋势数据"""
    ranks = []
    current_avg = sum(item['rank'] for item in top_50) / len(top_50)

    for i in range(52):
        if year == 2024:
            trend = 120 - i * 0.5
            noise = (i % 7) * 2 + random.randint(-5, 5)
            rank = trend + noise
        elif year == 2025:
            trend = 80 - i * 0.3
            noise = (i % 5) * 3 + random.randint(-4, 4)
            rank = trend + noise
        else:
            if i == 21:
                rank = current_avg
            else:
                distance = abs(i - 21)
                variation = distance * 0.8
                if i < 21:
                    rank = current_avg + variation + random.randint(-3, 8)
                else:
                    rank = current_avg - variation * 0.5 + random.randint(-3, 5)

        rank = max(1, min(250, rank))
        ranks.append(round(rank))

    return ranks


yearly_data = {
    '2024': {
        'weekly_ranks': generate_weekly_trend(80, 2024),
        'total_keywords': len(top_50)
    },
    '2025': {
        'weekly_ranks': generate_weekly_trend(50, 2025),
        'total_keywords': len(top_50)
    },
    '2026': {
        'weekly_ranks': generate_weekly_trend(25, 2026),
        'total_keywords': len(top_50)
    }
}

# 计算统计数据
for year, data in yearly_data.items():
    ranks = data['weekly_ranks']
    data['avg_rank'] = round(sum(ranks) / len(ranks))
    data['best_rank'] = min(ranks)
    data['worst_rank'] = max(ranks)

# ========== 7. 生成CSS和HTML文件 ==========
# CSS内容（与之前相同，省略重复，实际运行时需要包含）
css_content = '''* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', Roboto, 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #eef2f6 100%);
    min-height: 100vh;
}

.header {
    background: linear-gradient(135deg, #232f3e 0%, #1a2532 100%);
    color: white;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #ff9900 0%, #ff6600 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 12px rgba(255,153,0,0.3);
}

.logo-text {
    font-size: 20px;
    font-weight: 600;
}

.logo-badge {
    font-size: 11px;
    background: rgba(255,255,255,0.15);
    padding: 4px 12px;
    border-radius: 20px;
}

.update-info {
    font-size: 13px;
    color: rgba(255,255,255,0.8);
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
}

.year-tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.year-btn {
    padding: 10px 28px;
    border-radius: 40px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.25s ease;
    background: white;
    color: #1e293b;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid #e2e8f0;
}

.year-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.year-btn.active {
    background: linear-gradient(135deg, #ff9900 0%, #ff6600 100%);
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(255,153,0,0.3);
}

.category-section {
    background: white;
    border-radius: 20px;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #f0f2f5;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f2f5;
}

.section-icon {
    font-size: 18px;
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
}

.section-hint {
    font-size: 11px;
    color: #94a3b8;
    margin-left: auto;
}

.category-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.cat-btn {
    padding: 7px 18px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: white;
    color: #475569;
    transition: all 0.2s;
}

.cat-btn:hover {
    border-color: #ff9900;
    color: #ff9900;
    transform: translateY(-1px);
}

.cat-btn.active {
    background: linear-gradient(135deg, #ff9900 0%, #ff6600 100%);
    border-color: transparent;
    color: white;
}

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}

.kpi-card {
    background: white;
    border-radius: 20px;
    padding: 24px 20px;
    text-align: center;
    transition: all 0.3s;
    border: 1px solid #f0f2f5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.08);
}

.kpi-icon {
    font-size: 32px;
    margin-bottom: 10px;
}

.kpi-label {
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.kpi-value {
    font-size: 36px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.2;
}

.kpi-unit {
    font-size: 14px;
    font-weight: 400;
    color: #94a3b8;
}

.kpi-trend {
    font-size: 11px;
    margin-top: 8px;
    color: #64748b;
}

.trend-up {
    color: #10b981;
}

.trend-down {
    color: #ef4444;
}

.chart-card {
    background: white;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #f0f2f5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
}

.chart-title-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.chart-icon {
    font-size: 22px;
}

.chart-title {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
}

.chart-controls {
    display: flex;
    gap: 8px;
}

.chart-btn {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 6px 14px;
    border-radius: 30px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #475569;
}

.chart-btn:hover {
    background: #ff9900;
    border-color: #ff9900;
    color: white;
}

.chart-note {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 10px;
    display: inline-block;
}

.chart-box {
    width: 100%;
    height: 520px;
}

.table-container {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #f0f2f5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.table-header {
    display: grid;
    grid-template-columns: 60px 1fr 100px 120px 120px;
    background: #f8fafc;
    padding: 14px 20px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
}

.table-row {
    display: grid;
    grid-template-columns: 60px 1fr 100px 120px 120px;
    padding: 12px 20px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.2s;
    align-items: center;
}

.table-row:hover {
    background: #fafcff;
}

.rank-col {
    font-weight: 700;
    color: #ff6600;
}

.keyword-col {
    font-weight: 500;
    color: #1e293b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.text-right {
    text-align: right;
}

.trend-up {
    color: #10b981;
    font-weight: 600;
}

.trend-down {
    color: #ef4444;
    font-weight: 600;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #94a3b8;
}

.footer {
    text-align: center;
    padding: 24px;
    color: #94a3b8;
    font-size: 12px;
    border-top: 1px solid #e2e8f0;
    margin-top: 24px;
}

.footer p {
    margin: 4px 0;
}

@media (max-width: 900px) {
    .container { padding: 16px; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .table-header, .table-row { grid-template-columns: 45px 1fr 80px 90px 90px; font-size: 11px; gap: 4px; }
    .chart-box { height: 380px; }
    .year-btn { padding: 7px 18px; font-size: 12px; }
    .cat-btn { padding: 5px 12px; font-size: 11px; }
}

@media (max-width: 600px) {
    .kpi-value { font-size: 24px; }
    .table-header, .table-row { grid-template-columns: 35px 1fr 65px 70px 70px; padding: 8px 12px; }
}
'''

# 生成HTML
html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>亚马逊ABA关键词趋势分析 | 德国站</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">
                <div class="logo-icon">📊</div>
                <div class="logo-text">Amazon Brand Analytics</div>
                <div class="logo-badge">德国站 · 热门搜索词</div>
            </div>
            <div class="update-info">
                📅 数据周期: 2026年第22周 | 最后更新: {datetime.now().strftime('%Y-%m-%d')}
            </div>
        </div>
    </div>

    <div class="container">
        <div class="year-tabs" id="yearTabs">
            <button class="year-btn" data-year="2024">📅 2024年</button>
            <button class="year-btn" data-year="2025">📅 2025年</button>
            <button class="year-btn active" data-year="2026">📅 2026年</button>
            <button class="year-btn" data-year="compare">📊 三年对比</button>
        </div>

        <div class="category-section">
            <div class="section-header">
                <span class="section-icon">🏷️</span>
                <span class="section-title">产品分类筛选</span>
                <span class="section-hint">点击筛选对应类目关键词</span>
            </div>
            <div class="category-buttons" id="categoryButtons">
                <button class="cat-btn active" data-cat="all">📌 全部</button>
                <button class="cat-btn" data-cat="clothing">👕 服装服饰</button>
                <button class="cat-btn" data-cat="electronics">📱 电子产品</button>
                <button class="cat-btn" data-cat="home">🏠 家居用品</button>
                <button class="cat-btn" data-cat="sports">🏃 运动户外</button>
                <button class="cat-btn" data-cat="toys">🎮 玩具游戏</button>
                <button class="cat-btn" data-cat="books">📚 图书音像</button>
                <button class="cat-btn" data-cat="other">📌 其他</button>
            </div>
        </div>

        <div class="kpi-grid" id="kpiGrid">
            <div class="kpi-card"><div class="kpi-icon">🎯</div><div class="kpi-label">当前排名</div><div class="kpi-value" id="currentRank">--</div><div class="kpi-trend" id="rankTrend">--</div></div>
            <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">平均排名</div><div class="kpi-value" id="avgRank">--</div><div class="kpi-trend">52周平均值</div></div>
            <div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-label">最佳排名</div><div class="kpi-value" id="bestRank">--</div><div class="kpi-trend">年度最佳表现</div></div>
            <div class="kpi-card"><div class="kpi-icon">🏆</div><div class="kpi-label">关键词总数</div><div class="kpi-value" id="totalKeywords">--</div><div class="kpi-trend">有效关键词</div></div>
        </div>

        <div class="chart-card">
            <div class="chart-header">
                <div class="chart-title-wrapper"><div class="chart-icon">📈</div><div class="chart-title" id="chartTitle">关键词排名趋势 - 2026年</div></div>
                <div class="chart-controls"><button class="chart-btn" id="zoomInBtn">🔍 放大</button><button class="chart-btn" id="zoomOutBtn">🔍 缩小</button><button class="chart-btn" id="resetZoomBtn">⟳ 重置</button></div>
            </div>
            <div class="chart-note">📌 数值越小 = 排名越靠前 | 鼠标拖拽可缩放查看细节</div>
            <div id="trendChart" class="chart-box"></div>
        </div>

        <div class="table-container">
            <div class="table-header"><div class="rank-col">排名</div><div class="keyword-col">关键词</div><div class="trend-col text-right">周环比</div><div class="category-col text-right">分类</div><div class="brand-col text-right">Top品牌</div></div>
            <div id="tableBody"><div class="loading">加载数据中...</div></div>
        </div>

        <div class="footer"><p>数据来源：亚马逊品牌分析 | 德国站热门搜索词报告</p><p>数据文件: {os.path.basename(CSV_FILE_PATH)} | 基于真实TOP50关键词 + 模拟历史趋势</p></div>
    </div>
    <script src="script.js"></script>
</body>
</html>
'''

# ========== 8. 生成JavaScript文件 ==========
script_js = f'''/**
 * 亚马逊ABA关键词趋势分析
 * 数据来源: {os.path.basename(CSV_FILE_PATH)}
 * 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 */

const TOP_KEYWORDS = {json.dumps(top_50, ensure_ascii=False, indent=2)};
const WEEKS = {json.dumps(weeks)};
const YEARLY_DATA = {json.dumps(yearly_data, ensure_ascii=False, indent=2)};
const CATEGORY_NAMES = {json.dumps(category_names, ensure_ascii=False)};
const CATEGORY_ICONS = {json.dumps(category_icons, ensure_ascii=False)};
const CURRENT_AVG_RANK = {round(sum(item['rank'] for item in top_50) / len(top_50))};

let currentYear = '2026';
let currentCategory = 'all';
let currentChart = null;
let currentZoom = {{ start: 0, end: 100 }};

function init() {{
    updateCategoryCounts();
    setupEventListeners();
    updateKPI(currentYear);
    updateTable();
    renderChart();
}}

function updateCategoryCounts() {{
    const counts = {{}};
    TOP_KEYWORDS.forEach(kw => {{ counts[kw.category_key] = (counts[kw.category_key] || 0) + 1; }});
    document.querySelectorAll('.cat-btn').forEach(btn => {{
        const cat = btn.dataset.cat;
        if (cat === 'all') btn.innerHTML = `📌 全部 (${{TOP_KEYWORDS.length}})`;
        else if (counts[cat]) btn.innerHTML = `${{CATEGORY_ICONS[cat] || '📌'}} ${{CATEGORY_NAMES[cat] || cat}} (${{counts[cat]}})`;
    }});
}}

function setupEventListeners() {{
    document.querySelectorAll('.year-btn').forEach(btn => {{
        btn.addEventListener('click', () => {{
            document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentYear = btn.dataset.year;
            if (currentYear === 'compare') {{
                renderComparisonChart();
                document.getElementById('chartTitle').textContent = '关键词排名趋势 - 2024/2025/2026 三年对比';
            }} else {{
                updateKPI(currentYear);
                renderChart();
                document.getElementById('chartTitle').textContent = `关键词排名趋势 - ${{currentYear}}年`;
            }}
        }});
    }});
    document.querySelectorAll('.cat-btn').forEach(btn => {{
        btn.addEventListener('click', () => {{
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            updateTable();
        }});
    }});
    document.getElementById('zoomInBtn')?.addEventListener('click', () => zoomChart('in'));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoomChart('out'));
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => zoomChart('reset'));
    window.addEventListener('resize', () => currentChart?.resize());
    document.getElementById('updateTime').textContent = new Date().toLocaleDateString();
}}

function updateKPI(year) {{
    const data = YEARLY_DATA[year];
    if (!data) return;
    const weeklyRanks = data.weekly_ranks;
    const currentRank = weeklyRanks[weeklyRanks.length - 1];
    const firstRank = weeklyRanks[0];
    const changePercent = ((currentRank - firstRank) / firstRank * 100).toFixed(1);
    const isImproving = currentRank < firstRank;
    document.getElementById('currentRank').innerHTML = `${{currentRank}}<span class="kpi-unit">位</span>`;
    document.getElementById('avgRank').innerHTML = `${{data.avg_rank}}<span class="kpi-unit">位</span>`;
    document.getElementById('bestRank').innerHTML = `${{data.best_rank}}<span class="kpi-unit">位</span>`;
    document.getElementById('totalKeywords').innerHTML = `${{data.total_keywords.toLocaleString()}}<span class="kpi-unit">个</span>`;
    const trendEl = document.getElementById('rankTrend');
    trendEl.innerHTML = isImproving ? `📈 年度改善 ${{Math.abs(changePercent)}}%` : `📉 年度恶化 ${{Math.abs(changePercent)}}%`;
    trendEl.className = `kpi-trend ${{isImproving ? 'trend-up' : 'trend-down'}}`;
}}

function updateTable() {{
    let filtered = [...TOP_KEYWORDS];
    if (currentCategory !== 'all') filtered = filtered.filter(k => k.category_key === currentCategory);
    const tableBody = document.getElementById('tableBody');
    if (filtered.length === 0) {{ tableBody.innerHTML = '<div class="loading">暂无数据</div>'; return; }}
    tableBody.innerHTML = filtered.slice(0, 50).map((item, idx) => {{
        const trendValue = parseFloat(item.trend);
        const isUp = trendValue > 0;
        const trendClass = isUp ? 'trend-up' : 'trend-down';
        const trendSymbol = isUp ? '↑' : '↓';
        return `<div class="table-row"><div class="rank-col">${{idx + 1}}</div><div class="keyword-col" title="${{item.keyword}}">${{item.keyword}}</div><div class="text-right ${{trendClass}}">${{trendSymbol}} ${{Math.abs(trendValue).toFixed(1)}}%</div><div class="text-right">${{item.category}}</div><div class="text-right">🏷️ ${{item.brand}}</div></div>`;
    }}).join('');
}}

function rankAxisFor(...rankLists) {{
    const values = rankLists.flat().map(Number).filter(Number.isFinite);
    if (!values.length) return {{}};
    return {{ min: Math.min(...values), max: Math.max(...values) }};
}}

function renderChart() {{
    if (!currentChart) currentChart = echarts.init(document.getElementById('trendChart'));
    const yearData = YEARLY_DATA[currentYear];
    if (!yearData) return;
    const rankAxis = rankAxisFor(yearData.weekly_ranks);
    currentChart.setOption({{
        tooltip: {{ trigger: 'axis', triggerOn: 'mousemove|click', axisPointer: {{ type: 'line', snap: true }}, formatter: (params) => `<strong>${{params[0].axisValue}}</strong><br/>排名: ${{Math.round(params[0].value)}}位` }},
        grid: {{ left: '8%', right: '8%', bottom: '12%', top: '8%', containLabel: true }},
        xAxis: {{ type: 'category', data: WEEKS, name: '周次 (Week)', nameLocation: 'middle', nameGap: 40, axisLabel: {{ rotate: 45, interval: 5, fontSize: 10 }} }},
        yAxis: {{ type: 'value', name: '排名位置 (数值越小越靠前)', inverse: true, min: rankAxis.min, max: rankAxis.max }},
        dataZoom: [{{ type: 'slider', show: true, xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end, bottom: 5 }}, {{ type: 'inside', xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end }}],
        series: [{{ type: 'line', data: yearData.weekly_ranks, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: {{ width: 2.5, color: '#ff9900' }}, areaStyle: {{ opacity: 0.15, color: '#ff9900' }}, itemStyle: {{ color: '#ff6600' }}, label: {{ show: true, position: 'top', formatter: (p) => p.value <= 50 ? p.value : '', fontSize: 10 }} }}]
    }}, true);
}}

function renderComparisonChart() {{
    if (!currentChart) currentChart = echarts.init(document.getElementById('trendChart'));
    const rankAxis = rankAxisFor(
        YEARLY_DATA['2024'].weekly_ranks,
        YEARLY_DATA['2025'].weekly_ranks,
        YEARLY_DATA['2026'].weekly_ranks
    );
    currentChart.setOption({{
        tooltip: {{ trigger: 'axis', triggerOn: 'mousemove|click', axisPointer: {{ type: 'line', snap: true }}, formatter: (params) => {{
            let result = `<strong>${{params[0].axisValue}}</strong><br/>`;
            params.forEach(p => result += `${{p.marker}} ${{p.seriesName}}: ${{Math.round(p.value)}}位<br/>`);
            return result;
        }} }},
        legend: {{ data: ['2024年', '2025年', '2026年'], top: 0, right: 10, icon: 'circle' }},
        grid: {{ left: '8%', right: '8%', bottom: '12%', top: '12%', containLabel: true }},
        xAxis: {{ type: 'category', data: WEEKS, name: '周次 (Week)', nameLocation: 'middle', nameGap: 40, axisLabel: {{ rotate: 45, interval: 5, fontSize: 10 }} }},
        yAxis: {{ type: 'value', name: '排名位置', inverse: true, min: rankAxis.min, max: rankAxis.max }},
        dataZoom: [{{ type: 'slider', show: true, xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end, bottom: 5 }}, {{ type: 'inside', xAxisIndex: [0], start: currentZoom.start, end: currentZoom.end }}],
        series: [
            {{ name: '2024年', type: 'line', data: YEARLY_DATA['2024'].weekly_ranks, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: {{ width: 2, color: '#94a3b8' }}, areaStyle: {{ opacity: 0.08 }} }},
            {{ name: '2025年', type: 'line', data: YEARLY_DATA['2025'].weekly_ranks, smooth: true, symbol: 'diamond', symbolSize: 5, lineStyle: {{ width: 2, color: '#64748b' }}, areaStyle: {{ opacity: 0.08 }} }},
            {{ name: '2026年', type: 'line', data: YEARLY_DATA['2026'].weekly_ranks, smooth: true, symbol: 'triangle', symbolSize: 6, lineStyle: {{ width: 2.5, color: '#ff9900' }}, areaStyle: {{ opacity: 0.15 }} }}
        ]
    }}, true);
}}

function zoomChart(action) {{
    if (action === 'in') {{ currentZoom.start = Math.min(currentZoom.start + 10, 90); currentZoom.end = Math.max(currentZoom.end - 10, 10); }}
    else if (action === 'out') {{ currentZoom.start = Math.max(currentZoom.start - 10, 0); currentZoom.end = Math.min(currentZoom.end + 10, 100); }}
    else if (action === 'reset') {{ currentZoom = {{ start: 0, end: 100 }}; }}
    if (currentYear === 'compare') renderComparisonChart(); else renderChart();
}}

init();
'''

# ========== 9. 保存所有文件 ==========
os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
    f.write(html_content)
print(f"\n[OK] 已生成: {OUTPUT_HTML}")

with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
    f.write(script_js)
print(f"[OK] 已生成: {OUTPUT_JS}")

with open(OUTPUT_CSS, 'w', encoding='utf-8') as f:
    f.write(css_content)
print(f"[OK] 已生成: {OUTPUT_CSS}")

print(f"\n{'=' * 60}")
print(f"[OK] 生成完成！")
print(f"{'=' * 60}")
print(f"\n[INFO] 文件保存在: {OUTPUT_DIR}")
print(f"\n[INFO] 打开方式:")
print(f"   双击打开 {OUTPUT_HTML}")
print(f"\n[INFO] 数据统计:")
print(f"   - 关键词总数: {len(top_50)}")
print(f"   - 平均排名: {round(sum(item['rank'] for item in top_50) / len(top_50))}")
print(f"   - 分类数量: {len(cat_stats)}")
