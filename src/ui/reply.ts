import type { AppContext } from "../context.js";
import { formatTelegramHtmlChunks, splitMessage, splitPreformattedHtml } from "../telegram.js";
import type { ChatId, ReplyMarkup } from "../types.js";

const CHUNK_DELAY_MS = 800;

export interface SentMessage {
  message_id: number;
  text: string;
  parseMode?: "HTML";
}

export async function reply(context: AppContext, chatId: ChatId, text: string, replyMarkup?: ReplyMarkup): Promise<SentMessage[]> {
  const chunks = splitMessage(text, context.config.telegram.maxMessageChars);
  const sentMessages: SentMessage[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    try {
      const res = await context.telegram.sendMessage(chatId, chunks[index], index === chunks.length - 1 ? replyMarkup : undefined);
      if (res && typeof res.message_id === "number") {
        sentMessages.push({ message_id: res.message_id, text: chunks[index] });
      }
    } catch (error) {
      console.error("[reply] Failed to send chunk to chatId:", chatId, (error as Error).message);
    }
  }
  return sentMessages;
}

export async function replyWithFormattedResponse(context: AppContext, chatId: ChatId, text: string, replyMarkup?: ReplyMarkup): Promise<SentMessage[]> {
  const chunks = formatTelegramHtmlChunks(text, context.config.telegram.maxMessageChars);
  if (!chunks.length) {
    return reply(context, chatId, text, replyMarkup);
  }
  const sentMessages: SentMessage[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    try {
      const res = await context.telegram.sendMessage(chatId, chunks[index], index === chunks.length - 1 ? replyMarkup : undefined, "HTML");
      if (res && typeof res.message_id === "number") {
        sentMessages.push({ message_id: res.message_id, text: chunks[index], parseMode: "HTML" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("can't parse entities") || msg.includes("Bad Request")) {
        try {
          const fallbackText = chunks[index].replace(/<[^>]+>/g, "");
          const res = await context.telegram.sendMessage(chatId, fallbackText, index === chunks.length - 1 ? replyMarkup : undefined);
          if (res && typeof res.message_id === "number") {
            sentMessages.push({ message_id: res.message_id, text: fallbackText });
          }
        } catch (err) {
          console.error("[replyWithFormattedResponse] Failed to send fallback chunk to chatId:", chatId, (err as Error).message);
        }
      } else {
        console.error("[replyWithFormattedResponse] Failed to send chunk to chatId:", chatId, msg);
      }
    }
  }
  return sentMessages;
}

export async function replyWithHtml(context: AppContext, chatId: ChatId, html: string, replyMarkup?: ReplyMarkup): Promise<SentMessage[]> {
  const chunks = splitPreformattedHtml(html, context.config.telegram.maxMessageChars);
  const sentMessages: SentMessage[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const isLast = index === chunks.length - 1;
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    try {
      const res = await context.telegram.sendMessage(chatId, chunks[index], isLast ? replyMarkup : undefined, "HTML");
      if (res && typeof res.message_id === "number") {
        sentMessages.push({ message_id: res.message_id, text: chunks[index], parseMode: "HTML" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("can't parse entities") || msg.includes("Bad Request")) {
        try {
          const fallbackText = chunks[index].replace(/<[^>]+>/g, "");
          const res = await context.telegram.sendMessage(chatId, fallbackText, isLast ? replyMarkup : undefined);
          if (res && typeof res.message_id === "number") {
            sentMessages.push({ message_id: res.message_id, text: fallbackText });
          }
        } catch (err) {
          console.error("[replyWithHtml] Failed to send fallback chunk to chatId:", chatId, (err as Error).message);
        }
      } else {
        console.error("[replyWithHtml] Failed to send chunk to chatId:", chatId, msg);
      }
    }
  }
  return sentMessages;
}
