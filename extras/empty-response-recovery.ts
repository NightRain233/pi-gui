import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Recover empty successful completions through Pi's append-only settlement API. */
export default function emptyResponseRecovery(pi: ExtensionAPI) {
  let enabled = true;
  let active = false;
  let remaining = 1;
  const handled = new Set<string>();

  pi.on("before_agent_start", () => {
    active = true;
    remaining = 1;
    handled.clear();
  });
  pi.on("session_start", () => {
    active = false;
  });
  pi.on("session_shutdown", () => {
    active = false;
  });
  pi.on("agent_settled", () => {
    active = false;
  });

  pi.registerCommand("empty-recovery", {
    description: "Empty response recovery: status | on | off (current session)",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase();
      if (action === "off") enabled = false;
      else if (action === "on") enabled = true;
      else if (action && action !== "status") {
        ctx.ui.notify("用法：/empty-recovery status | on | off", "warning");
        return;
      }
      ctx.ui.notify(
        `空回复自动续跑：${enabled ? "已启用" : "已关闭"}；每次请求最多续跑一次。`,
        "info",
      );
    },
  });

  pi.on("agent_before_settle", (event, ctx) => {
    if (
      !enabled ||
      !active ||
      event.outcome !== "completed" ||
      ctx.signal?.aborted ||
      event.continue ||
      event.context.pendingMessages.length > 0
    )
      return;

    const final = event.context.contextMessages.at(-1);
    if (
      final?.role !== "assistant" ||
      final.stopReason !== "stop" ||
      !final.content.every(
        (block) => block.type === "thinking" || (block.type === "text" && !block.text.trim()),
      )
    )
      return;

    // Use the projected entry's real ID; never edit a tool result or raw history.
    const source = [...event.context.contextEntries]
      .reverse()
      .find((entry) => entry.messages.length > 0)?.sourceEntry;
    if (source?.type !== "message" || source.message.role !== "assistant" || handled.has(source.id))
      return;
    handled.add(source.id);

    const omit = { type: "context_edit" as const, targetId: source.id, replacement: null };
    if (remaining === 0) {
      return {
        entries: [
          ...event.entries,
          omit,
          {
            type: "custom_message" as const,
            customType: "empty-response-recovery",
            content: "模型连续两次未返回正文，已停止自动续跑。可以手动重试或切换模型。",
            display: true,
            details: { result: "exhausted", targetId: source.id },
          },
        ],
        continue: false,
      };
    }

    remaining -= 1;
    ctx.ui.notify("模型未返回正文，正在自动续跑（1/1）。", "warning");
    return {
      entries: [
        ...event.entries,
        omit,
        {
          type: "custom_message" as const,
          customType: "empty-response-recovery",
          content:
            "The previous response ended without a visible answer or tool call. " +
            "Continue the user's existing task using the current context and completed tool results. " +
            "Do not repeat actions that already succeeded. If the task is finished, provide the final answer.",
          display: false,
          details: { result: "retry", attempt: 1, targetId: source.id },
        },
      ],
      continue: true,
    };
  });
}
