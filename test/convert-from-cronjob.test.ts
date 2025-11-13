import { describe, expect, test } from "bun:test";
import convertFromCronjob from "../src/convert-from-cronjob";

describe("convertFromCronjob", () => {
  test("converts every minute cron to wildcard calendar", () => {
    expect(convertFromCronjob("* * * * *")).toBe("*-*-* *:*:00");
  });

  test("converts specific daily time", () => {
    expect(convertFromCronjob("15 9 * * *")).toBe("*-*-* 09:15:00");
  });

  test("converts weekday constrained cron", () => {
    expect(convertFromCronjob("0 */6 * * 1-5")).toBe("Mon..Fri *-*-* */6:00:00");
  });

  test("respects month and day of month", () => {
    expect(convertFromCronjob("0 0 1 1 *")).toBe("*-1-1 00:00:00");
  });

  test("splits day-of-week and day-of-month restriction", () => {
    expect(convertFromCronjob("0 9 1 * MON")).toBe("*-*-1 09:00:00\nMon *-*-* 09:00:00");
  });

  test("supports textual months and steps", () => {
    expect(convertFromCronjob("*/30 6 * JAN-MAR SUN")).toBe(
      "Sun *-1..3-* 06:*/30:00",
    );
  });

  test("maps macros", () => {
    expect(convertFromCronjob("@daily")).toBe("daily");
  });
});
