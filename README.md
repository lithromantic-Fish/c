# 移动审批 H5

基于 **Vue 3 + Vite + Vant 4** 实现的移动审批平台前端，按照 `work-flow/移动审批平台设计稿` 中的 11 张设计稿还原。

## 环境要求

**Node.js >= 18**（推荐 20 LTS）。若打包报 `crypto.getRandomValues is not a function`，说明 Node 版本过低，请升级后再 build。

```bash
node -v   # 应 >= v18.0.0
```

Windows 可从 [https://nodejs.org](https://nodejs.org) 安装 **20 LTS**；若用 nvm-windows：`nvm install 20 && nvm use 20`。

## 启动

```bash
cd work-flow-app
npm install
npm run dev
```

默认开发地址：http://localhost:5180/

### 配置

静态站点项（企微、路径、跳转等）在 **`src/config/systemconfig.js`**，与旧 PC 的 `systemconfig.js` 一致；嵌入宿主时可用 **`window.config`** 覆盖同名字段（含 `redirectParamUrl` 时用于列表跳转）。

可选：复制 `.env.example` 为 `.env`，仅用于调整 **`VITE_API_BASE`**；改 `.env` 后需 **重启** `npm run dev`。

构建产物可直接部署到甲方 **`/uniflow/front/`**，替代 `workflow_center_ui` 二次开发版本。详见 **[docs/DEPLOY.md](docs/DEPLOY.md)**。

```bash
cd work-flow-app
npm install
npm run build
```

将 **`dist/`** 目录内容上传到服务器 `uniflow/front/` 即可。

### 配置

静态站点项在 **`src/config/systemconfig.js`**（已与 flow-test 对齐）；嵌入时可用 **`window.config`** 覆盖。

### 核心架构（解决 iOS 业务接口无回调）

- **认证**：`src/utils/authRedirect.js` + `src/views/Redirect.vue`（裸 axios）
- **业务 API**：`src/api/http.js`（原生 Promise，替代 `$q.defer`）
- **路由**：`createWebHistory` + `/uniflow/front/pages/*` 路径

## 已实现页面

| 路由 | 页面 | 设计稿 |
| --- | --- | --- |
| `/` | 移动审批首页 | 3-17366 |
| `/climb` | CLIMB 流程列表（待办/已办/待阅/已阅 + 分类筛选 + 搜索 + 下拉刷新 + 空状态） | 11-01154 / 11-01513 / 11-02088 / 11-07345 / 11-07346 / 14-04118 / 14-9828 / 3-07497 / 3-09032 / 3-09568 / 3-10471 / 3-10884 / 3-13561 |
| `/filter` | 高级筛选（日期 / 部门 / 创建人三个弹层） | 11-8119 / 11-07620 / 11-08410 / 11-09342 |
| `/not-supported` | 不支持企业微信内操作 | 14-00187 |

## iPad / 大屏适配

`App.vue` 中的 `.app-frame` 设置了 `max-width: 500px` 并居中，外层灰背景。

- 在手机上：全屏显示，看起来与原生 H5 一致
- 在 iPad / 桌面：内容区域居中限宽，两侧浅灰背景，避免布局拉伸变形

## 主题色

- 主色：`#1989FA`
- 页面底色：`#F5F6F8`

均在 `src/styles/index.scss` 的 `:root` 中以 CSS 变量定义，便于后续品牌色统一调整。

## 切图

来自 `work-flow/移动审批平台切图`，已拷贝到 `src/assets/icons/`，全部使用 SVG，矢量无锯齿。

## 目录

```
src/
├── App.vue                # 外层容器 + iPad 适配
├── main.js                # 入口
├── router/index.js        # 路由表
├── styles/index.scss      # 全局变量 + Vant 主题覆盖
├── assets/icons/          # 切图 SVG
├── components/
│   └── FlowItem.vue       # 流程列表项
└── views/
    ├── Home.vue
    ├── ClimbList.vue
    ├── AdvancedFilter.vue
    └── NotSupported.vue
```
