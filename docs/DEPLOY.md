# 部署说明（替代 workflow_center_ui 二次开发）

本包为 **独立 Vite 构建**，可直接部署到甲方 `flow-test.clamc.com` 的 `/uniflow/front/` 目录，**不再依赖**公司移动端模板里的 `helper/http.js`（`$q.defer` + `requestHandle`）。

## 与公司模板的差异（解决 iOS 回调问题）

| 公司模板 | 本包 |
| --- | --- |
| `helper/http.js` + `$q.defer` | `src/api/http.js` 原生 axios + Promise |
| 业务 Promise 在 iOS 可能永不 resolve | 拦截器直接 `return res.data` |
| 认证与业务混在同一封装 | 认证 `getAuthTokenByCode` 裸 axios，业务走 `http.js` |

## 构建

```bash
cd work-flow-app
npm install
npm run build
```

产物在 **`dist/`** 目录，静态资源在 **`dist/static/`**（非默认的 `assets/`）。

## 服务器部署

将 **`dist/` 内全部文件** 上传到 Web 服务器目录，对应访问前缀：

```text
https://flow-test.clamc.com/uniflow/front/
```

### Nginx 示例

```nginx
location /uniflow/front/ {
  alias /data/www/uniflow/front/;
  try_files $uri $uri/ /uniflow/front/index.html;
}

location /api/ {
  proxy_pass https://flow-test.clamc.com;
  proxy_set_header Host $host;
}
```

> `/api` 需与现网一致反向代理到后端；若网关已统一代理，可只部署静态资源。

## 页面路由（与 workflow.js 一致）

| 路径 | 页面 |
| --- | --- |
| `/uniflow/front/pages/mobileApproval` | 移动审批首页 |
| `/uniflow/front/pages/climbProcess` | CLIMB 列表 |
| `/uniflow/front/pages/AdvancedFilter` | 高级筛选 |
| `/uniflow/front/pages/Nosupported` | 不支持提示 |
| `/uniflow/front/pages/redirect` | 企微 OAuth 回调 |
| `/uniflow/front/pages/index` | 认证入口（同首页） |

## 企微后台配置

1. **可信域名**：`flow-test.clamc.com`
2. **OAuth 回调 redirect_uri**：
   ```text
   https://flow-test.clamc.com/uniflow/front/pages/redirect
   ```
3. 应用主页可指向：
   ```text
   https://flow-test.clamc.com/uniflow/front/pages/mobileApproval
   ```

## 运行时配置（可选）

部署后可在 `index.html` 前注入：

```html
<script>
  window.config = {
    redirectParamUrl: 'https://flow-test.clamc.com/api/...',
    qywxCorpId: 'ww53ecb42f7fb2166c',
  }
</script>
```

默认见 `src/config/systemconfig.js`。

## 白屏 / vConsole 不出现

1. **vConsole 用法**：必须用 `new VConsole()`，不能 `app.use(VConsole)`（不是 Vue 插件）。
2. **静态资源 404**：构建产物 `base` 为 `/uniflow/front/`，必须部署到该路径下。打开浏览器 Network，若 `index-xxx.js` 404，页面会白屏且 vConsole 也起不来。
3. **Nginx**：需 `try_files $uri $uri/ /uniflow/front/index.html;`
4. 本包已在 `main.js` 最早阶段动态加载 vConsole，并打印 `[boot] app mounted` 便于确认 JS 是否执行。

## 验证清单（甲方 iOS）

1. 打开首页，vConsole Log 应出现 `[home-count] 2. after http` 及待办数字。
2. 进入 CLIMB 列表，列表可加载、item 可点击。
3. 若仅 Network 有数据但 Log 无 `2. after http`，检查 `/api` 代理与 `auth_token` 是否写入 localStorage。

## 替换现网步骤

1. 备份原 `/uniflow/front/` 静态资源。
2. 上传本包 `dist/` 内容覆盖。
3. 确认 Nginx `try_files` 指向 `index.html`（history 路由）。
4. 企微 redirect_uri 指向 `/pages/redirect`。
5. 让领导 iOS 清缓存后重进应用验证。
