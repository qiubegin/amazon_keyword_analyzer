#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Keyword product selection demo backend."""

import csv
import os
import re
from collections import Counter
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

from flask import Flask, jsonify, request


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_ROOT = BASE_DIR / "processed_data"
TRANSLATION_FILE = BASE_DIR / "translation_rules" / "keyword_translations_de_zh.csv"
FILE_PATTERN = "*Week_*_processed.csv"
DEFAULT_SITE = "DE"
SITES = [
    {"code": "DE", "name": "\u5fb7\u56fd\u7ad9", "flag": "\U0001f1e9\U0001f1ea"},
    {"code": "FR", "name": "\u6cd5\u56fd\u7ad9", "flag": "\U0001f1eb\U0001f1f7"},
    {"code": "IT", "name": "\u610f\u5927\u5229\u7ad9", "flag": "\U0001f1ee\U0001f1f9"},
    {"code": "ES", "name": "\u897f\u73ed\u7259\u7ad9", "flag": "\U0001f1ea\U0001f1f8"},
    {"code": "AU", "name": "\u6fb3\u5927\u5229\u4e9a\u7ad9", "flag": "\U0001f1e6\U0001f1fa"},
]
SITE_CODES = {item["code"] for item in SITES}

COL_KEYWORD = "搜索词"
COL_RANK = "搜索频率排名"
COL_CATEGORY1 = "点击量最高的类别 #1"
COL_CATEGORY2 = "点击量最高的类别 #2"
COL_CATEGORY3 = "点击量最高的类别 #3"
COL_ASIN1 = "点击量最高的商品 #1：ASIN"
COL_ASIN2 = "点击量最高的商品 #2：ASIN"
COL_ASIN3 = "点击量最高的商品 #3：ASIN"
COL_CLICK_SHARE = "前三ASIN点击份额占比"
COL_CONVERSION_SHARE = "前三ASIN转化份额占比"

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def parse_float(value):
    if value is None:
        return 0.0
    text = str(value).strip().replace("%", "").replace(",", ".")
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_int(value):
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return 0


def parse_range_value(value):
    if not value or value == "all":
        return None
    value = str(value)
    if value.startswith("gte_"):
        return (parse_float(value[4:]), None)
    parts = value.split("_", 1)
    if len(parts) != 2:
        return None
    return (parse_float(parts[0]), parse_float(parts[1]))


def parse_multi_range_values(value):
    if not value or value == "all":
        return ["all"]
    ranges = [item.strip() for item in str(value).split(",") if item.strip()]
    if not ranges or "all" in ranges:
        return ["all"]
    return ranges


def in_rank_range(value, range_value):
    parsed = parse_range_value(range_value)
    if parsed is None:
        return True
    min_value, max_value = parsed
    if min_value is not None and value < min_value:
        return False
    if max_value is not None and value > max_value:
        return False
    return True


def in_search_volume_bucket(rank, bucket):
    if not bucket or bucket == "all":
        return True
    if bucket == "high":
        return rank <= 100000
    if bucket == "low":
        return rank > 100000
    return True


def in_number_range(value, range_value, upper_inclusive=False):
    parsed = parse_range_value(range_value)
    if parsed is None:
        return True
    min_value, max_value = parsed
    if min_value is not None and value < min_value:
        return False
    if max_value is not None:
        return value <= max_value if upper_inclusive else value < max_value
    return True


def in_any_number_range(value, range_values, upper_inclusive=False):
    return any(
        in_number_range(value, item, upper_inclusive=upper_inclusive)
        for item in parse_multi_range_values(range_values)
    )


def short_rank_number(value):
    value = int(value)
    if value >= 10000:
        amount = value / 10000
        text = str(int(amount)) if amount.is_integer() else f"{amount:g}"
        return f"{text}W"
    if value >= 1000:
        amount = value / 1000
        text = str(int(amount)) if amount.is_integer() else f"{amount:g}"
        return f"{text}k"
    return str(value)


def rank_range_label(start, end=None):
    if end is None:
        return f"{short_rank_number(start)}以上"
    label_start = start - 1 if start > 1 else start
    return f"{short_rank_number(label_start)}-{short_rank_number(end)}"


def rank_step_for_max_rank(max_rank):
    if max_rank <= 20000:
        return 1000
    if max_rank <= 100000:
        return 5000
    if max_rank <= 300000:
        return 10000
    return 50000


def rank_option_ranges(max_rank=None):
    if max_rank:
        step = rank_step_for_max_rank(max_rank)
        ranges = []
        start = 1
        while start <= max_rank:
            end = min(start + step - 1, max_rank)
            ranges.append((f"{start}_{end}", rank_range_label(start, end)))
            start = end + 1
        return ranges

    ranges = []
    for start in range(1, 25002, 5000):
        end = start + 4999
        ranges.append((f"{start}_{end}", rank_range_label(start, end)))
    for start in range(30001, 90002, 10000):
        end = start + 9999
        ranges.append((f"{start}_{end}", rank_range_label(start, end)))
    for start in range(100001, 450002, 50000):
        end = start + 49999
        ranges.append((f"{start}_{end}", rank_range_label(start, end)))
    ranges.append(("gte_500001", rank_range_label(500001)))
    return ranges


def percent_option_ranges():
    return [(f"{start}_{start + 10}", f"{start}%-{start + 10}%") for start in range(0, 100, 10)]


def change_option_ranges():
    ranges = [("flat", "持平")]
    for direction, label_prefix in (("up", "提升"), ("down", "下降")):
        for start in range(1, 9002, 1000):
            end = start + 999
            ranges.append((f"{direction}_{start}_{end}", f"{label_prefix} {start:,}-{end:,}名"))
        ranges.append((f"{direction}_gte_10001", f"{label_prefix} 10,001名以上"))
    return ranges


def option_items_with_counts(base_items, ranges, value_getter, matcher, all_label):
    options = [{"value": "all", "label": all_label, "count": len(base_items)}]
    for value, label in ranges:
        count = sum(1 for item in base_items if matcher(value_getter(item), value))
        if count:
            options.append({"value": value, "label": f"{label} ({count:,})", "count": count})
    return options


def option_items_without_counts(ranges, all_label):
    return [{"value": "all", "label": all_label, "count": 0}] + [
        {"value": value, "label": label, "count": 0}
        for value, label in ranges
    ]


def normalize_site(value):
    code = str(value or DEFAULT_SITE).strip().upper()
    return code if code in SITE_CODES else DEFAULT_SITE


def site_data_dir(site):
    return DATA_ROOT / normalize_site(site)


def parse_week_from_name(path, site):
    match = re.search(r"Week_(\d{4})_(\d{2})_(\d{2})", path.name)
    if not match:
        return None
    year, month, day = map(int, match.groups())
    end_date = datetime(year, month, day).date()
    start_date = end_date - timedelta(days=6)
    iso_year, iso_week, _ = end_date.isocalendar()
    return {
        "id": end_date.isoformat(),
        "site": normalize_site(site),
        "year": iso_year,
        "week": iso_week,
        "label": f"{iso_year} W{iso_week:02d} ({start_date.isoformat()} ~ {end_date.isoformat()})",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "file": path.name,
        "path": path,
    }


def load_week_files(site=DEFAULT_SITE):
    site = normalize_site(site)
    weeks = []
    for path in sorted(site_data_dir(site).glob(FILE_PATTERN)):
        meta = parse_week_from_name(path, site)
        if meta:
            weeks.append(meta)
    return sorted(weeks, key=lambda item: item["end_date"])


def public_week(meta):
    return {key: value for key, value in meta.items() if key != "path"}


def get_week_meta(week_id=None, site=DEFAULT_SITE):
    site = normalize_site(site)
    weeks = load_week_files(site)
    if not weeks:
        return None
    if week_id:
        for meta in weeks:
            if meta["id"] == week_id:
                return meta
    return weeks[-1]


def latest_data_update_time(site=DEFAULT_SITE):
    files = list(site_data_dir(site).glob(FILE_PATTERN))
    if not files:
        return ""
    latest_file = max(files, key=lambda path: path.stat().st_mtime)
    return datetime.fromtimestamp(latest_file.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")


@lru_cache(maxsize=1)
def load_keyword_translations():
    translations = {}
    if not TRANSLATION_FILE.exists():
        return translations
    with TRANSLATION_FILE.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            keyword = (row.get(COL_KEYWORD) or "").strip().lower()
            translation = (row.get("中文翻译") or "").strip()
            if keyword and translation:
                translations[keyword] = translation
    return translations


def translate_keyword(keyword):
    return load_keyword_translations().get((keyword or "").strip().lower(), "")


def row_to_record(row, meta=None):
    keyword = (row.get(COL_KEYWORD) or "").strip()
    return {
        "keyword": keyword,
        "keyword_cn": translate_keyword(keyword),
        "rank": parse_int(row.get(COL_RANK)),
        "weekly_volume": 0,
        "click_share": parse_float(row.get(COL_CLICK_SHARE)),
        "conversion_share": parse_float(row.get(COL_CONVERSION_SHARE)),
        "category1": (row.get(COL_CATEGORY1) or "").strip(),
        "category2": (row.get(COL_CATEGORY2) or "").strip(),
        "category3": (row.get(COL_CATEGORY3) or "").strip(),
        "asin1": (row.get(COL_ASIN1) or "").strip(),
        "asin2": (row.get(COL_ASIN2) or "").strip(),
        "asin3": (row.get(COL_ASIN3) or "").strip(),
        "report_date": (row.get("报告日期") or (meta or {}).get("end_date") or "").strip(),
    }


@lru_cache(maxsize=64)
def records_for_week(site, week_id):
    site = normalize_site(site)
    meta = get_week_meta(week_id, site)
    if not meta:
        return tuple()
    records = []
    with meta["path"].open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            record = row_to_record(row, meta)
            if record["keyword"] and record["rank"]:
                record["year"] = meta["year"]
                record["week"] = meta["week"]
                record["week_id"] = meta["id"]
                record["date"] = meta["end_date"]
                records.append(record)
    return tuple(records)


def iso_week_count(year):
    return date(year, 12, 28).isocalendar()[1]


def year_skeleton(year):
    return [
        {
            "year": year,
            "week": week,
            "label": f"{year} W{week:02d}",
            "short_label": f"周{week}",
            "date": None,
            "value": None,
        }
        for week in range(1, iso_week_count(year) + 1)
    ]


def trend_series_for_keyword(keyword, category, selected_meta):
    keyword_key = (keyword or "").strip().lower()
    selected_year = selected_meta["year"] if selected_meta else datetime.now().year
    site = selected_meta.get("site", DEFAULT_SITE) if selected_meta else DEFAULT_SITE
    years = [selected_year - 2, selected_year - 1, selected_year]
    points_by_year = {year: year_skeleton(year) for year in years}

    for meta in load_week_files(site):
        if meta["year"] not in points_by_year:
            continue
        for record in records_for_week(site, meta["id"]):
            if record["keyword"].lower() != keyword_key:
                continue
            if category and category != "all" and record["category1"] != category:
                continue
            week_index = meta["week"] - 1
            if 0 <= week_index < len(points_by_year[meta["year"]]):
                points_by_year[meta["year"]][week_index] = {
                    "year": meta["year"],
                    "week": meta["week"],
                    "label": f"{meta['year']} W{meta['week']:02d}",
                    "short_label": f"周{meta['week']}",
                    "date": meta["end_date"],
                    "value": record["rank"],
                }
            break

    return [
        {"year": year, "name": str(year), "points": points_by_year[year]}
        for year in years
    ]


def flatten_trend_points(series):
    return [point for item in series for point in item["points"] if point.get("value") is not None]


def previous_week_meta(selected_meta):
    site = selected_meta.get("site", DEFAULT_SITE)
    weeks = load_week_files(site)
    for idx, meta in enumerate(weeks):
        if meta["id"] == selected_meta["id"] and idx > 0:
            return weeks[idx - 1]
    return None


def rank_change_for_record(record, category, selected_meta):
    prev_meta = previous_week_meta(selected_meta)
    if not prev_meta:
        return {"status": "unknown", "label": "暂无上周数据", "previous_rank": None, "delta": None}
    keyword_key = record["keyword"].lower()
    site = selected_meta.get("site", DEFAULT_SITE)
    for prev in records_for_week(site, prev_meta["id"]):
        if prev["keyword"].lower() != keyword_key:
            continue
        if category and category != "all" and prev["category1"] != category:
            continue
        previous_rank = prev["rank"]
        delta = previous_rank - record["rank"]
        if delta > 0:
            return {"status": "up", "label": f"提升 {abs(delta):,}名", "previous_rank": previous_rank, "delta": delta}
        if delta < 0:
            return {"status": "down", "label": f"下降 {abs(delta):,}名", "previous_rank": previous_rank, "delta": delta}
        return {"status": "flat", "label": "持平", "previous_rank": previous_rank, "delta": 0}
    return {"status": "unknown", "label": "暂无上周数据", "previous_rank": None, "delta": None}


def in_keyword_change_range(change, range_value):
    if not range_value or range_value == "all":
        return True
    if not change:
        return False
    status = change.get("status")
    if range_value == "flat":
        return status == "flat"
    if "_" not in range_value:
        return True
    direction, range_part = range_value.split("_", 1)
    if direction not in {"up", "down"} or status != direction:
        return False
    return in_rank_range(abs(parse_int(change.get("delta"))), range_part)


def enrich_record_trend(record, category, selected_meta):
    series = trend_series_for_keyword(record["keyword"], category, selected_meta)
    record["rank_trend_series"] = series
    record["rank_trend"] = flatten_trend_points(series)
    record["rank_change"] = rank_change_for_record(record, category, selected_meta)


def keyword_year_groups(site, year, base_rank="all", category=""):
    site = normalize_site(site)
    groups = {}
    for meta in load_week_files(site):
        if meta["year"] != year:
            continue
        for record in records_for_week(site, meta["id"]):
            if category and category != "all" and record["category1"] != category:
                continue
            if not in_rank_range(record["rank"], base_rank):
                continue
            key = record["keyword"].strip().lower()
            if not key:
                continue
            groups.setdefault(key, []).append({
                "week": meta["week"],
                "rank": record["rank"],
            })
    for items in groups.values():
        items.sort(key=lambda item: item["week"])
    return groups


def has_seasonal_pattern(items):
    by_week = {item["week"]: item["rank"] for item in items}
    for week in sorted(by_week):
        weeks = [week, week + 1, week + 2, week + 3]
        if not all(item in by_week for item in weeks):
            continue
        ranks = [by_week[item] for item in weeks]
        if any(abs(ranks[idx] - ranks[idx - 1]) > 10000 for idx in range(1, len(ranks))):
            return True
    return False


def has_stable_pattern(items):
    weeks = sorted({item["week"] for item in items})
    if len(weeks) > 26:
        return True
    for start_week in range(1, 28):
        end_week = start_week + 25
        count = sum(1 for week in weeks if start_week <= week <= end_week)
        if count > 13:
            return True
    return False


def keyword_profile_set(site, year, profile, base_rank="all", category=""):
    if not profile or profile == "all":
        return None
    groups = keyword_year_groups(site, year, base_rank, category)
    matched = set()
    for keyword, items in groups.items():
        if profile == "seasonal" and has_seasonal_pattern(items):
            matched.add(keyword)
        elif profile == "stable" and has_stable_pattern(items):
            matched.add(keyword)
        elif profile == "extreme" and len({item["week"] for item in items}) > 39:
            matched.add(keyword)
    return matched


@app.route("/api/options")
def options():
    site = normalize_site(request.args.get("site"))
    weeks = load_week_files(site)
    latest = weeks[-1] if weeks else None
    return jsonify({
        "sites": SITES,
        "weeks": [public_week(item) for item in weeks],
        "latest_week": latest["id"] if latest else None,
        "latest_data_update": latest_data_update_time(site),
        "default_category": "all",
        "categories": [],
    })


@app.route("/api/filter_options")
def filter_options():
    site = normalize_site(request.args.get("site"))
    week_id = request.args.get("week")
    base_rank = request.args.get("base_rank", "all")
    category = request.args.get("category", "")
    meta = get_week_meta(week_id, site)
    if not meta:
        return jsonify({
            "categories": [],
            "default_category": "",
            "selected_category": "",
            "rank_options": [{"value": "all", "label": "全部排名", "count": 0}],
            "click_options": [{"value": "all", "label": "全部点击份额", "count": 0}],
            "conversion_options": [{"value": "all", "label": "全部转化份额", "count": 0}],
            "change_options": [{"value": "all", "label": "全部变化", "count": 0}],
        })

    base_records = [record for record in records_for_week(site, meta["id"]) if in_rank_range(record["rank"], base_rank)]
    category_counter = Counter(record["category1"] for record in base_records if record["category1"])
    categories = [{"name": name, "count": count} for name, count in category_counter.most_common()]
    selected_category = category if category else "all"
    scoped_records = [
        record for record in base_records
        if selected_category == "all" or record["category1"] == selected_category
    ]

    return jsonify({
        "categories": categories,
        "default_category": "all" if categories else "",
        "selected_category": selected_category if categories else "",
        "rank_options": option_items_with_counts(scoped_records, rank_option_ranges(max((item["rank"] for item in scoped_records), default=0)), lambda item: item["rank"], in_rank_range, "全部排名"),
        "click_options": option_items_with_counts(scoped_records, percent_option_ranges(), lambda item: item["click_share"], lambda value, rv: in_number_range(value, rv, upper_inclusive=True), "全部点击份额"),
        "conversion_options": option_items_with_counts(scoped_records, percent_option_ranges(), lambda item: item["conversion_share"], lambda value, rv: in_number_range(value, rv, upper_inclusive=True), "全部转化份额"),
        "change_options": option_items_without_counts(change_option_ranges(), "全部变化"),
    })


@app.route("/api/keywords")
def keywords():
    site = normalize_site(request.args.get("site"))
    week_id = request.args.get("week")
    category = request.args.get("category", "")
    keyword_query = request.args.get("q", "").strip().lower()
    base_rank = request.args.get("base_rank", "all")
    rank_range = request.args.get("rank", "all")
    volume_bucket = request.args.get("volume", "all")
    click_range = request.args.get("click", "all")
    conversion_range = request.args.get("conversion", "all")
    change_range = request.args.get("change", "all")
    keyword_profile = request.args.get("keyword_profile", "all")
    page = max(parse_int(request.args.get("page", 1)) or 1, 1)
    page_size = min(max(parse_int(request.args.get("page_size", 25)) or 25, 1), 100)
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    meta = get_week_meta(week_id, site)
    if not meta:
        return jsonify({"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0})

    profile_keywords = keyword_profile_set(site, meta["year"], keyword_profile, base_rank, category)
    items = []
    total = 0
    for source in records_for_week(site, meta["id"]):
        record = dict(source)
        if profile_keywords is not None and record["keyword"].strip().lower() not in profile_keywords:
            continue
        if category and category != "all" and record["category1"] != category:
            continue
        if keyword_query and keyword_query not in record["keyword"].lower():
            continue
        if not in_rank_range(record["rank"], base_rank):
            continue
        if not in_rank_range(record["rank"], rank_range):
            continue
        if not in_search_volume_bucket(record["rank"], volume_bucket):
            continue
        if not in_any_number_range(record["click_share"], click_range, upper_inclusive=True):
            continue
        if not in_any_number_range(record["conversion_share"], conversion_range, upper_inclusive=True):
            continue
        if change_range != "all":
            enrich_record_trend(record, category, meta)
            if not in_keyword_change_range(record["rank_change"], change_range):
                continue

        if start_index <= total < end_index:
            if "rank_trend_series" not in record:
                enrich_record_trend(record, category, meta)
            items.append(record)
        total += 1

    total_pages = (total + page_size - 1) // page_size if total else 0
    return jsonify({
        "week": public_week(meta),
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    })


@app.route("/api/keyword_suggestions")
def keyword_suggestions():
    site = normalize_site(request.args.get("site"))
    week_id = request.args.get("week")
    category = request.args.get("category", "")
    base_rank = request.args.get("base_rank", "all")
    keyword_profile = request.args.get("keyword_profile", "all")
    limit = min(max(parse_int(request.args.get("limit", 10)) or 10, 1), 50)
    meta = get_week_meta(week_id, site)
    if not meta:
        return jsonify({"items": []})

    profile_keywords = keyword_profile_set(site, meta["year"], keyword_profile, base_rank, category)
    items = []
    for record in records_for_week(site, meta["id"]):
        if profile_keywords is not None and record["keyword"].strip().lower() not in profile_keywords:
            continue
        if category and category != "all" and record["category1"] != category:
            continue
        if not in_rank_range(record["rank"], base_rank):
            continue
        items.append({
            "keyword": record["keyword"],
            "keyword_cn": record["keyword_cn"],
            "rank": record["rank"],
            "category1": record["category1"],
            "click_share": record["click_share"],
            "conversion_share": record["conversion_share"],
        })

    items.sort(key=lambda item: item["rank"])
    return jsonify({"items": items[:limit]})


@app.route("/api/trend")
def trend():
    site = normalize_site(request.args.get("site"))
    keyword = request.args.get("keyword", "").strip()
    category = request.args.get("category", "")
    week_id = request.args.get("week")
    meta = get_week_meta(week_id, site)
    if not meta or not keyword:
        return jsonify({"keyword": keyword, "series": [], "points": [], "year": None})
    series = trend_series_for_keyword(keyword, category, meta)
    return jsonify({
        "keyword": keyword,
        "series": series,
        "points": flatten_trend_points(series),
        "year": meta["year"],
    })


if __name__ == "__main__":
    app.run(
        host=os.getenv("APP_HOST", "127.0.0.1"),
        port=int(os.getenv("APP_PORT", "5002")),
        debug=False,
    )
