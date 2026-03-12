import test from "node:test";
import assert from "node:assert/strict";
import { getConfiguredDestinations } from "../src/delivery.js";

test("getConfiguredDestinations reports telegram only when both token and chat id are present", () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;
  const previousSlack = process.env.SLACK_WEBHOOK_URL;

  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.TELEGRAM_CHAT_ID = "";
  delete process.env.SLACK_WEBHOOK_URL;
  assert.deepEqual(getConfiguredDestinations(), []);

  process.env.TELEGRAM_CHAT_ID = "12345";
  assert.deepEqual(getConfiguredDestinations(), ["telegram"]);

  if (previousToken === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }

  if (previousChatId === undefined) {
    delete process.env.TELEGRAM_CHAT_ID;
  } else {
    process.env.TELEGRAM_CHAT_ID = previousChatId;
  }

  if (previousSlack === undefined) {
    delete process.env.SLACK_WEBHOOK_URL;
  } else {
    process.env.SLACK_WEBHOOK_URL = previousSlack;
  }
});
