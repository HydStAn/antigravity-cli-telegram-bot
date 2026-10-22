import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";
import { resetForumTopicNameIfAutoRenamed } from "../src/usecases/topic-reset.js";

const base = { TELEGRAM_BOT_TOKEN: "token", TELEGRAM_ALLOWED_USER_IDS: "123", AGY_WORKSPACE: "/srv/workspace" };

test("autoTopicRename configuration defaults to false (opt-in)", () => {
  const config = loadConfig(base);
  assert.equal(config.telegram.autoTopicRename, false);
});

test("autoTopicRename can be enabled via env TELEGRAM_AUTO_TOPIC_RENAME=1", () => {
  const config = loadConfig({ ...base, TELEGRAM_AUTO_TOPIC_RENAME: "1" });
  assert.equal(config.telegram.autoTopicRename, true);
});

test("resetForumTopicNameIfAutoRenamed calls editForumTopic with Topic <threadId> when topic was auto-renamed", async () => {
  let editedChatId: any = null;
  let editedThreadId: any = null;
  let editedName: string | null = null;

  const mockContext: any = {
    telegram: {
      editForumTopic: async (chatId: any, threadId: number, name: string) => {
        editedChatId = chatId;
        editedThreadId = threadId;
        editedName = name;
        return true;
      },
    },
    state: {
      session: (key: string) => {
        if (key === "-100123:5") {
          return { hasAutoRenamedTopic: true };
        }
        return null;
      },
    },
  };

  // Case 1: Topic was auto-renamed
  await resetForumTopicNameIfAutoRenamed(mockContext, "-100123:5");
  assert.equal(editedChatId, -100123);
  assert.equal(editedThreadId, 5);
  assert.equal(editedName, "Topic 5");

  // Reset trackers
  editedChatId = null;
  editedThreadId = null;
  editedName = null;

  // Case 2: Topic was NOT auto-renamed
  await resetForumTopicNameIfAutoRenamed(mockContext, "-100123:6");
  assert.equal(editedName, null, "Should not edit topic if not auto-renamed");

  // Case 3: Thread 1 (General topic) should not be reset
  await resetForumTopicNameIfAutoRenamed(mockContext, "-100123:1");
  assert.equal(editedName, null, "Should not edit thread 1");
});
