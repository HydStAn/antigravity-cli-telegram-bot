import type { AppContext } from "../context.js";
import { parseChatTarget } from "../telegram/client.js";
import type { ChatId } from "../types.js";

export async function resetForumTopicNameIfAutoRenamed(
  context: AppContext,
  chatId: ChatId
): Promise<void> {
  const session = context.state.session(chatId);
  const target = parseChatTarget(chatId);

  // If this topic was auto-renamed and has a thread ID > 1
  if (session?.hasAutoRenamedTopic && target.messageThreadId && target.messageThreadId !== 1) {
    const defaultTopicName = `Topic ${target.messageThreadId}`;
    try {
      await context.telegram.editForumTopic(target.chatId, target.messageThreadId, defaultTopicName);
    } catch (error) {
      console.debug(`[TopicReset] Failed to reset topic name: ${(error as Error).message}`);
    }
  }
}
