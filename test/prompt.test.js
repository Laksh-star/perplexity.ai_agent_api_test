import test from "node:test";
import assert from "node:assert/strict";
import { buildWindow } from "../src/prompt.js";

test("buildWindow returns an inclusive date span matching the requested day count", () => {
  const RealDate = Date;

  class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super("2026-03-12T10:00:00+05:30");
        return;
      }
      super(...args);
    }

    static now() {
      return new RealDate("2026-03-12T10:00:00+05:30").valueOf();
    }
  }

  globalThis.Date = MockDate;

  try {
    const window = buildWindow(5);
    assert.deepEqual(window, {
      startDate: "2026-03-08",
      endDate: "2026-03-12"
    });
  } finally {
    globalThis.Date = RealDate;
  }
});
