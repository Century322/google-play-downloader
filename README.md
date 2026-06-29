# Google Play Downloader

聚合 Google Play 应用搜索与下载的 Web 工具。后端通过 `google-play-scraper` 抓取应用元数据，下载链接指向 APKPure / APKMirror 等第三方镜像站，本站不直接上传或缓存任何 APK。

## 功能

- 关键词搜索 + 搜索建议（自动补全）
- 热门免费 / 趋势飙升 / 畅销精选 / 热门付费榜单
- 按应用类别筛选
- 应用详情：评分、下载量、版本、内容分级、截图、开发者信息、相似应用、版本历史
- 收藏应用并定时追踪版本更新（数据存于 localStorage）
- 一键下载 APK（跳转 APKPure 镜像）+ 扫码下载

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

> 注意：后端需要能直连 Google Play（`play.google.com`）。若所在网络无法访问，搜索/列表接口会超时，属网络环境问题，非代码问题。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `LANG` | `zh` | 应用元数据语言 |
| `COUNTRY` | `us` | Google Play 商店地区 |

## 构建

```bash
npm run build     # 构建前端 + 打包 server.cjs
npm start         # 运行生产服务器 dist/server.cjs
```

## 免责声明

数据来源于 Google Play 公开页面。APK 下载链接由第三方镜像站提供，本站不直接上传或缓存任何应用。请遵守当地法律法规及 Google Play 服务条款。
