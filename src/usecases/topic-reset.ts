import type { AppContext } from "../context.js";
import { parseChatTarget } from "../telegram/client.js";
import type { ChatId } from "../types.js";

export async function resetForumTopicNameIfAutoRenamed(
  context: AppContext,
  chatId: ChatId
): Promise<void> {
  const session = context.state.session(chatId);
  const target = parseChatTarget(chatId);
  const effectiveThreadId = target.messageThreadId ?? (context.config.telegram.enableTopics ? 1 : undefined);

  // If this topic was auto-renamed and has a thread ID (or is the default forum topic 1)
  if (session?.hasAutoRenamedTopic && effectiveThreadId !== undefined) {
    const defaultTopicName = effectiveThreadId === 1 ? "General" : `Topic ${effectiveThreadId}`;
    try {
      await context.telegram.editForumTopic(target.chatId, effectiveThreadId, defaultTopicName);
    } catch (error) {
      console.debug(`[TopicReset] Failed to reset topic name: ${(error as Error).message}`);
    }
  }
}
