/**
 * Paperclip Surge 定时任务开关运行器。
 * 参数: enabled=on|off&url=<原始脚本地址>&merge=on|off
 * 仅在 enabled=on 时下载并执行原作者脚本。原作者脚本在 Surge 全局环境中运行。
 * 注意：这是兼容适配层，不修改原脚本的签到逻辑。
 */
(function () {
  const raw = typeof $argument === "string" ? $argument : "";
  const p = {};
  for (const item of raw.split("&")) {
    const i = item.indexOf("=");
    if (i > 0) p[item.slice(0, i)] = item.slice(i + 1);
  }
  if (p.enabled !== "on") {
    console.log("[Paperclip] 已在模块编辑参数中关闭：" + $script.name);
    $done();
    return;
  }
  const url = p.url;
  if (!/^https:\/\/raw\.githubusercontent\.com\/MaYIHEI\/paperclip\/refs\/heads\/main\/(?:app|miniprogram)\/[a-z0-9_-]+\/[a-z0-9_.-]+\.js$/i.test(url || "")) {
    console.log("[Paperclip] 非法脚本地址，已停止执行");
    $done();
    return;
  }
  // Surge 的 $argument 为字符串；原脚本使用对象参数实现通知合并。
  // 不伪造对象，以免原脚本误判；统一汇总仍可独立执行。
  $httpClient.get({url, timeout: 25}, function (err, resp, data) {
    if (err || !resp || resp.status !== 200 || !data) {
      console.log("[Paperclip] 下载原脚本失败：" + String(err || (resp && resp.status)));
      $done();
      return;
    }
    try {
      (0, eval)(String(data) + "\n//# sourceURL=" + url);
    } catch (e) {
      console.log("[Paperclip] 脚本执行异常：" + String(e && e.stack || e));
      $done();
    }
  });
})();
