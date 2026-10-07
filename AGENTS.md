# fonts-vault

本仓是字体库和 `/api/css`。不是 `app.windfonts.com` 的页面。

仓库 `README.md` 开头写「生产真源：本仓 → app.windfonts.com」是过时的。app 静态页在 `fonts-front`，桶是杭州 `wenfeng-web-hz`。本仓决定接口认不认一个 `family`。

## 接口认什么

- 库字段 `fontFamily`（形如 `wenfeng-xwwkb`）是 `/api/css?family=` 的查找键。
- `normalizedName` 用来拼 OSS 路径：`fonts-packages/{normalizedName 小写}/{字重}/{version}/result.css`。公开桶只保留小写目录。不要把库里的 CamelCase 原样拿去请求。
- `data/family-aliases.json` 把请求改写成另一个 `family`。改写结果必须是库里真实存在的 `fontFamily`。缺文件就按原名查。
- 返回的 `@font-face` 名称是 `WF-{Normalized}`。页面上的 `wenfeng-*` 由店面自己包，不要改成让接口直接输出店面短码。

## 2026-10-07 生产 `fontFamily` 已改成店面短码

feicode-prod `prod.db` 已把 495 条 published `fontFamily` 改成店面新短码（含 Harmony `wenfeng-harmsa`、Bright `wenfeng-xwwkb`）。备份 `data/prod.db.bak-20261007-family-rename` 与 `family-aliases.json.bak-20261007-family-rename`。别名 1080 键，旧码→新码。不要改回 `xwbright` / `harmony`。

不要整份覆盖店面那 1120 键：店面有的目标在 vault 没有行。不要把 `kaiso` 别去 `kisjp`（Kaisei Opti 占用了这个码；カイソウ是 `kisjp`）。撞码旧码不要当别名键：`cjkfqlt`/`hcth`/`ddxstyx`/`zmxs` 现在是新主人的 live family。别名值若已经是改名后的 live family，不要再顺着上一任的 old→new 改写（`cltan` 停在 `hcth`，`allseto` 停在 `cjkfqlt`，`ddxty` 停在 `ddxstyx`）。

OSS 路径小写已热补生产 chunk `src_lib_eb2ebd0d._.js`（源码 `css.service.ts` 同步改了，未发镜像）。新镜像发布前要再补一次，或带上这份源码。

本文件所在分支如果不是要发布的 `main`，不要在这个分支上改生产别名文件。本地 `data/family-aliases.json` 应与生产一致，不要用店面那份覆盖生产。

## 不要做

- 不要为了让店面张数一致去整库导出覆盖 `fonts-front/data/fonts.json`。导出会冲掉店面手写的简介和许可列。
- 不要把同一条字体的店面短码、OSS 目录、库里的 `fontFamily` 收成同一个字符串。三处本来就可以不同，靠别名衔接。
- 证书队列 `font-certs` 是客户上传的引用证明，不是 wenfeng.org 的许可核验，不要混用。
