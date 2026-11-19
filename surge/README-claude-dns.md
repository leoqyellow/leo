# Claude 分流与 IPv6 / DNS（Surge）

把原有 **Mihomo / Clash 覆写 JavaScript** 改写成了 **Surge 可安装的模块**，并将「Claude 分流」「可选共享域名」「全局 DNS / IPv6」拆开，避免混合修改后产生副作用。

## 文件

| 文件 | 作用 | 是否建议开启 |
| --- | --- | --- |
| [claude-routing.sgmodule](./claude-routing.sgmodule) | Claude/Anthropic 专属域名走指定策略；仅对这些域名的 UDP 443 拒绝以尝试 TCP 回退 | 推荐 |
| [claude-shared-services.sgmodule](./claude-shared-services.sgmodule) | 补充 Statsig、Sift、Sentry、Datadog 等跨应用共享域名 | 默认不启用，按需开启 |
| [ipv6-dns-privacy.sgmodule](./ipv6-dns-privacy.sgmodule) | 关闭 Surge IPv6，配置加密 DNS，并接管能捕获到的 53 端口 DNS 请求 | 可选，先阅读下述风险 |

## 导入地址

- Claude 主模块：https://raw.githubusercontent.com/leoqyellow/leo/main/surge/claude-routing.sgmodule
- 可选共享域名：https://raw.githubusercontent.com/leoqyellow/leo/main/surge/claude-shared-services.sgmodule
- IPv6 与 DNS：https://raw.githubusercontent.com/leoqyellow/leo/main/surge/ipv6-dns-privacy.sgmodule

在 Surge 的 **模块** 中按 URL 安装，并在「编辑参数」设置策略名称。

## 必看：Claude 策略组需要手动创建

**Surge 的模块不能创建、删除或置顶主配置中的 `[Proxy Group]`。**
默认参数 `ClaudePolicy=Claude`，因此主配置中必须已有名为 `Claude` 的策略组 / 代理；否则请在模块编辑参数中把 `ClaudePolicy` 换成现有名称。

要有独立的 Claude 策略组，可在**主配置**的 `[Proxy Group]` 部分增加类似配置（将示例节点名称替换为真实存在的节点）：

```ini
[Proxy Group]
Claude = select, 你的实际节点名称, DIRECT
```

已有 `[Proxy Group]` 时**只需在原有分组下添加组定义，不要再重复添加同名 section**。这里的 `你的实际节点名称` 是占位符，不能原样使用。

主模块不依赖 JavaScript；适用于 Surge iOS 与 Mac。Mac 上若想给 **整个 Claude 进程** 分流，可在主配置按 Surge 的 `PROCESS-NAME` 规则另行配置；iOS 不支持进程规则，Windows 下的 `claude.exe` 正则也不能原样移植。

## DNS 模块的使用前提和限制

1. `DNSPolicy` 默认是 `Claude`；如果主配置没有该策略组，先修改为现有策略组名称。DoH 通过该策略路由，但不代表所有系统或第三方应用 DNS 都能被接管。
2. **Surge 官方说明：**若代理服务器使用域名，而连接此代理需要先查询当前加密 DNS，会出现循环依赖；Surge 将警告并可能让 **DoH 请求回退为 DIRECT**。要避免这一点，需要使用 IP 地址形式的代理服务器，或妥善处理代理服务器的引导解析。不要把本模块宣传为「绝对防 DNS 泄漏」。
3. `hijack-dns = *:53` 只接管 Surge 捕获的 53 端口传统 DNS，不等于可以拦截第三方应用直接发出的 DoH / DoQ / DoT；可能与内网专用 DNS、企业 VPN、酒店认证等冲突，遇到问题请停用此模块排查。
4. `ipv6 = false` 和 `ipv6-vif = disabled` 关闭的是 Surge 的 IPv6 处理；不是对设备上所有网络路径的一键防泄漏承诺。
5. 原 Mihomo 的 `enhanced-mode: fake-ip` 及 `nameserver-policy: geosite:cn` 在 Surge 中没有一一对应的 `dns` 对象：Surge 在 VIF 中自行管理 Fake-IP，也有 `[Host]` 定向 DNS 映射，但不能把 `GEOSITE` 表达式直接复制过来。
6. `GEOIP,CN,DIRECT,no-resolve` 可以放在主配置 **`FINAL` 之前**，但不应由本 DNS 模块强插在所有规则前面，以免干扰现有代理和网络规则；私有局域网直连也应由主配置按需维护。
7. 两台或多台设备的出口一致性还取决于实际代理、浏览器指纹、账号状态、缓存与服务端机制；阻断 UDP 443 不能保证 Cloudflare 验证一定成功。

## 改写要点

- `GEOSITE,anthropic` → 明确的 `DOMAIN` / `DOMAIN-SUFFIX` 列表；
- `PROCESS-NAME-REGEX` → iOS 不支持进程规则，已剔除；
- 全局 `AND,((NETWORK,UDP),(DST-PORT,443)),REJECT` → Surge `PROTOCOL,UDP` + `DEST-PORT,443` + Claude 域名限制；
- Mihomo 的 `proxy-groups` / `include-all` → 主 Surge 配置中手动创建选择策略组，模块用 `{{{ClaudePolicy}}}` 参数引用；
- Mihomo 的 `dns.default-nameserver` / `proxy-server-nameserver` / `nameserver-policy` → Surge `[General]` 中的 `dns-server`、`encrypted-dns-server` 等设置，**不是精确等价转换**。

官方参考：
- https://manual.nssurge.com/profile/module.html
- https://manual.nssurge.com/profile/general.html
- https://manual.nssurge.com/dns/encrypted-dns.html
- https://manual.nssurge.com/rules/protocol-and-network.html
- https://manual.nssurge.com/rules/logical.html
