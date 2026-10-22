import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeTopicName, truncateGraphemes } from "../src/domain/topic-namer.js";

test("truncateGraphemes truncates by grapheme cluster without breaking emojis", () => {
  assert.equal(truncateGraphemes("⏰Lichtwecker", 6), "⏰Licht");
  assert.equal(truncateGraphemes("🏎️T150 Pro", 5), "🏎️T150");
  assert.equal(truncateGraphemes("Short", 6), "Short");
});

test("sanitizeTopicName cleans quotes, markdown, and limits length", () => {
  assert.equal(sanitizeTopicName('"⏰Licht"'), "⏰Licht");
  assert.equal(sanitizeTopicName("`🎮BeamNG`"), "🎮BeamN");
  assert.equal(sanitizeTopicName("**🎭Act.**"), "🎭Act.");
  assert.equal(sanitizeTopicName("💡Idee für Chat"), "💡Idee ");
});
