import { spawn } from "node:child_process";
import type { AppConfig } from "../types.js";

const segmenter = new Intl.Segmenter("de", { granularity: "grapheme" });

export function truncateGraphemes(text: string, maxGraphemes: number): string {
  const graphemes = Array.from(segmenter.segment(text), (s) => s.segment);
  if (graphemes.length <= maxGraphemes) return text;
  return graphemes.slice(0, maxGraphemes).join("");
}

export function sanitizeTopicName(raw: string): string {
  // Strip quotes, backticks, newlines, markdown
  let cleaned = raw
    .replace(/["`*#_~\[\]]/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim();

  // If there is an emoji at the start, keep emoji + max 4-5 chars
  // Enforce max 6 graphemes total (e.g. ⏰Licht, 🎮Beam)
  return truncateGraphemes(cleaned, 6);
}

export async function generateTopicShortName(
  config: AppConfig,
  prompt: string,
  replyText?: string,
  signal?: AbortSignal
): Promise<string | null> {
  if (!config.agy?.bin) return null;

  const cleanPrompt = prompt.replace(/\s+/g, " ").slice(0, 300);
  const cleanReply = replyText ? replyText.replace(/\s+/g, " ").slice(0, 300) : "";

  const taskPrompt = `Generate a 1-emoji plus 4-5 letter ultra-compact topic label for this conversation turn.
Examples: ⏰Licht, 🎮Beam, 🎭Act., 🏎️T150, 💡Idee.
Rule: 1 emoji immediately followed by 3 to 5 characters describing the topic. Total max 6 glyphs.
Output ONLY the label (e.g. ⏰Licht), without any explanations, quotes, or markdown.

User prompt: ${cleanPrompt}
Assistant answer: ${cleanReply}`;

  const args = [
    "--print",
    taskPrompt,
    "--model",
    config.stt?.agyModel || "gemini-3.8-flash-low",
    "--effort",
    "low",
    "--disable-slash-commands",
  ];

  if (config.agy.allowDangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  return new Promise((resolve) => {
    let stdout = "";
    const proc = spawn(config.agy.bin, args, { signal });

    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve(null);
    }, 15_000);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout.trim()) {
        resolve(null);
        return;
      }
      const rawFirstLine = stdout.trim().split("\n")[0].trim();
      const sanitized = sanitizeTopicName(rawFirstLine);
      resolve(sanitized || null);
    });
  });
}
