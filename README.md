# Google Play Downloader

聚合 Google Play 应用搜索与下载的 Web 工具。后端通过 `google-play-scraper` 抓取应用元数据，下载链接指向 APKPure / APKMirror 等第三方镜像站，本站不直接上传或缓存任何 APK。

## 功能

- 关键词搜索 + 搜索建议（自动补全）
- 热门免费 / 畅销精选 / 热门付费榜单（与 Google Play 官方榜单一致）
- 按 52 个官方应用类别筛选
- 应用详情：评分、下载量、版本、内容分级、截图、开发者信息、相似应用、版本历史
- 用户评论展示（最新 / 评分 / 最有帮助三种排序）
- 数据安全信息（收集的数据、共享的数据、安全实践、所需权限、隐私政策）
- 收藏应用并定时追踪版本更新（数据存于 localStorage，跨标签页同步）
- 一键下载 APK（智能选择 APK / XAPK 格式）+ 扫码下载
- 服务器端缓存（Map + TTL，降低重复请求延迟）
- 列表分页 + 无限滚动
- 骨架屏加载动画
- PWA 可安装（manifest + favicon）

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS v4 + Vite
- **后端**：Express + `google-play-scraper` + `express-rate-limit`
- **图标**：lucide-react

## 本地运行

**前置要求**：Node.js 18+

```bash
# 1. 安装依赖
npm install

# 2. （可选）复制并修改环境变量
cp .env.example .env

# 3. 启动开发服务器
npm run dev
```

默认访问 http://localhost:3000

> 注意：后端需要能直连 Google Play（`play.google.com`）。若所在网络无法访问，搜索/列表接口会超时，属网络环境问题，非代码问题。部署到海外节点（如 Render 新加坡区）可解决。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口（Render 会自动注入） |
| `LANG` | `zh` | 应用元数据语言 |
| `COUNTRY` | `us` | Google Play 商店地区 |

## 构建

```bash
npm run build     # 构建前端 + 打包 server.cjs
npm start         # 运行生产服务器 dist/server.cjs
```

## 部署

### 推送到 GitHub

```bash
# 1. 在 GitHub 创建一个空仓库（不要勾选 README / .gitignore / license）

# 2. 在项目根目录初始化并推送（替换为你的仓库地址）
git init
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git add .
git commit -m "Initial commit: Google Play Downloader"
git push -u origin main
```

如果使用 HTTPS 推送时提示需要凭据，建议改用 SSH（`git@github.com:<用户名>/<仓库名>.git`）或在 GitHub 配置 Personal Access Token。

### 部署到 Render

仓库内已包含 `render.yaml`，支持 Blueprint 一键部署。

**方式 A：Blueprint 一键部署（推荐）**

1. 登录 https://dashboard.render.com
2. 右上角 **New +** → **Blueprint**
3. 选择刚才推送的 GitHub 仓库
4. Render 会自动识别 `render.yaml`，点击 **Apply** 即可

**方式 B：手动创建 Web Service**

1. **New +** → **Web Service**
2. 连接 GitHub 仓库
3. 填入配置：
   - **Runtime**：Node
   - **Build Command**：`npm ci && npm run build`
   - **Start Command**：`npm start`
   - **Plan**：Free（或 Starter 避免冷启动）
4. **Create Web Service**

### 关于 Render 免费套餐

- 免费套餐每月 750 小时（足够 1 个 7×24 服务）
- **15 分钟无请求会自动休眠**，下次访问有约 30–60 秒冷启动延迟
- 512MB 内存，无持久磁盘
- 若需无休眠 + 更高配额，可升级到 **Starter**（$7/月，512MB → 512MB 但不休眠）

查看额度使用情况：Render Dashboard → 左侧 **Billing** 或服务页面的 **Usage** 标签。

## 免责声明

数据来源于 Google Play 公开页面。APK 下载链接由第三方镜像站提供，本站不直接上传或缓存任何应用。请遵守当地法律法规及 Google Play 服务条款。
