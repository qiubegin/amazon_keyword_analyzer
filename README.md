# Amazon Keyword Analyzer

面向亚马逊站点热门搜索词的关键词分析 Demo。项目当前以德国站（`DE`）数据为主，提供数据清洗、关键词筛选、趋势查询和前端可视化能力。

## 当前组成

```text
.
├── backend_keyword_demo/app.py       # Flask API，默认端口 5002
├── frontend_keyword_demo/            # 前端静态页面
├── preprocess_hot_search_terms.py    # 原始数据清洗脚本
├── generate_dashboard.py             # 早期静态看板生成脚本
├── filter_rules/                     # 类目和品牌停用词规则
├── translation_rules/                # 关键词翻译映射
├── raw_data/                         # 原始数据（不纳入 Git）
└── processed_data/                   # 清洗结果（不纳入 Git）
```

## 本地运行

项目使用 Python 3.11+，后端依赖 Flask，数据清洗还需要 `openpyxl`。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install Flask openpyxl
```

如果需要运行 `generate_dashboard.py` 读取 Excel，再安装：

```powershell
pip install pandas
```

### 1. 准备数据并清洗

把原始 CSV 放入 `raw_data/`，文件名建议使用：

```text
DE_热门搜索词_简单_Week_YYYY_MM_DD.csv
```

执行：

```powershell
python preprocess_hot_search_terms.py
```

强制重新处理全部文件：

```powershell
python preprocess_hot_search_terms.py --force
```

脚本会根据 `filter_rules/` 规则生成 `processed_data/*_processed.csv`。

### 2. 启动后端

```powershell
python backend_keyword_demo/app.py
```

本地检查：

```text
http://127.0.0.1:5002/api/health
```

主要接口：

```text
GET /api/health
GET /api/options
GET /api/keywords
GET /api/trend
GET /api/keyword_suggestions
GET /api/filter_options
```

### 3. 启动前端

另开一个终端：

```powershell
cd frontend_keyword_demo
python -m http.server 5173
```

浏览器访问：<http://127.0.0.1:5173>

前端 API 地址目前写在 `frontend_keyword_demo/src/main.js` 的 `API_BASE` 中。本地默认值为 `http://127.0.0.1:5002`；部署服务器时应改为域名或服务器地址，生产环境建议通过 Nginx 反向代理到同一域名下。

## Git 提交边界

仓库只提交源代码、规则和小型配置文件。原始数据、清洗后的数据、虚拟环境、IDE 配置和 Python 缓存已在 `.gitignore` 中排除。

当前数据目录约 975 MB，不建议直接推送到 GitHub。部署时请通过服务器文件上传、对象存储或数据版本库单独同步 `raw_data/` 和 `processed_data/`。如果确实需要版本化大文件，应评估 Git LFS 的存储和流量成本。

## 阿里云部署建议

以下以 Ubuntu 云服务器为例：

```bash
git clone git@github.com:<用户名>/<私有仓库名>.git
cd <仓库目录>
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install Flask openpyxl
```

然后把经过审核的数据目录同步到服务器：

```text
raw_data/
processed_data/
```

开发测试可以启动：

```bash
python backend_keyword_demo/app.py
```

但当前代码默认监听 `127.0.0.1:5002`，只适合本机访问。正式部署前应将后端监听地址改为可配置的 `0.0.0.0`，或使用 Nginx/Apache 反向代理；同时不要直接暴露 Flask 开发服务器。还需要在阿里云安全组只开放必要端口（通常是 `80/443`），并配置 HTTPS、进程守护（如 systemd）和日志轮转。

## 安全注意事项

- 不要提交 `.env`、密码、API Key、私钥或服务器配置。
- 私有 GitHub 仓库不等于绝对安全，拥有仓库权限的人仍可读取内容。
- 上传到服务器前检查数据中是否包含客户信息、账号信息或其他敏感字段。
- 使用 SSH Deploy Key 或最小权限的 GitHub Token 拉取私有仓库，不要把 Token 写入 README 或脚本。

