# Intel Mac / macOS Monterey 安装说明

这是 NightRain233/pi-gui 提供的社区构建，适用于 Intel Mac、macOS 12.0 及以上。
包含上游 main 的功能及中文标点内加粗的 Markdown 修复。

## 安装

1. 下载名称包含 `macos12-x64.dmg` 的安装包，打开后将 pi-gui 拖入“应用程序”。
2. 首次运行时，在 Finder 的“应用程序”中按住 Control 点击 pi-gui，选择“打开”。
   此版本使用临时签名，没有 Apple 公证；如果系统仍拦截，可在“系统偏好设置 → 安全性与隐私 → 通用”中允许打开。
3. 按正常流程配置模型账号或自定义提供商，即可开始对话。

ZIP 与 DMG 包含相同应用。`SHA256SUMS.txt` 提供下载文件校验值。

## 自动续跑扩展（可选）

下载同一 Release 的 `empty-response-recovery.ts`，放到 `~/.pi/agent/extensions/`，
然后在 pi-gui 的 Extensions 页面点击 Refresh，或重启应用。
已有同名扩展时请先备份，再替换。

扩展只在模型正常结束却没有正文或工具调用时续跑一次；连续两次空回复后会提示停止。
正常回答、错误和用户主动停止不会触发续跑。可用 `/empty-recovery status` 查看状态。

## 验证范围

构建流程检查实际 Mach-O 二进制的 Intel 架构及最低系统版本，验证打包后的运行时依赖，
并在 GitHub 的 Intel Mac runner 上测试启动、新建会话、真实集成终端和 ZIP 解包运行。
这些检查不等于已经完成 macOS Monterey 实机测试，仍需在目标机器上确认。
首次使用建议检查：中文输入、回复流式显示、选中文字引用、Markdown、工具执行和停止。

应用内的更新提示仍指向上游官方发布；Intel/Monterey 安装包请从本 fork 的 Releases 下载。

## 后续构建

在本仓库 Actions → Build Intel Mac (Monterey) → Run workflow 手动构建。
流程成功后自动创建新的 `monterey-*` Release，保留源码提交和兼容性检查报告。
同步上游时保留本 workflow、Monterey 打包配置和验证脚本；新运行时依赖也必须继续通过兼容性检查。
