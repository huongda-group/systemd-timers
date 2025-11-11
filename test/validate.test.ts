import { expect, test } from "bun:test";
import validateSystemdCalendarSpec from "../src/validate";

// Basic explicit specs
test("accepts specific timestamp 2024-12-25 14:30:00", () => {
  expect(validateSystemdCalendarSpec("2024-12-25 14:30:00")).toBe(true);
});

test("accepts wildcard midnight *-*-* 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:00:00")).toBe(true);
});

test("accepts every minute pattern *-*-* *:*:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* *:*:00")).toBe(true);
});

test("accepts weekday plus time Mon *-*-* 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon *-*-* 09:00:00")).toBe(true);
});

test("accepts day-of-month pattern *-*-15 10:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-15 10:00:00")).toBe(true);
});

// Shortcut keywords and time-only specs
test("accepts keyword daily", () => {
  expect(validateSystemdCalendarSpec("daily")).toBe(true);
});

test("accepts keyword hourly", () => {
  expect(validateSystemdCalendarSpec("hourly")).toBe(true);
});

test("accepts keyword monthly", () => {
  expect(validateSystemdCalendarSpec("monthly")).toBe(true);
});

test("accepts keyword weekly", () => {
  expect(validateSystemdCalendarSpec("weekly")).toBe(true);
});

test("accepts keyword yearly", () => {
  expect(validateSystemdCalendarSpec("yearly")).toBe(true);
});

test("accepts keyword annually", () => {
  expect(validateSystemdCalendarSpec("annually")).toBe(true);
});

test("accepts wildcard hour with minutes *-*-* 02:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 02:00")).toBe(true);
});

test("accepts simple time 12:00", () => {
  expect(validateSystemdCalendarSpec("12:00")).toBe(true);
});

// Multiple occurrences
test("accepts multi weekday list Mon,Fri *-*-* 10:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon,Fri *-*-* 10:00:00")).toBe(true);
});

test("accepts weekday range Mon..Fri *-*-* 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon..Fri *-*-* 09:00:00")).toBe(true);
});

test("accepts multiple days of month *-*-1,15 *:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-1,15 *:00:00")).toBe(true);
});

test("accepts multiple times 09:00,15:00,21:00", () => {
  expect(validateSystemdCalendarSpec("09:00,15:00,21:00")).toBe(true);
});

test("accepts weekend list Sat,Sun 20:00:00", () => {
  expect(validateSystemdCalendarSpec("Sat,Sun 20:00:00")).toBe(true);
});

// Ranges inside fields
test("accepts hour range *-*-* 9..17:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 9..17:00:00")).toBe(true);
});

test("accepts minute range *-*-* 0..6:30:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 0..6:30:00")).toBe(true);
});

test("accepts month range *-07-* 00..04:00:00", () => {
  expect(validateSystemdCalendarSpec("*-07-* 00..04:00:00")).toBe(true);
});

// Complex combinations
test("accepts weekday plus month-day Mon *-8-1 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon *-8-1 09:00:00")).toBe(true);
});

test("accepts first day of month *-*-1 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-1 00:00:00")).toBe(true);
});

test("accepts christmas day *-12-25 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-12-25 00:00:00")).toBe(true);
});

test("accepts first week monday Mon *-*-1..7 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon *-*-1..7 09:00:00")).toBe(true);
});

// Edge cases and timezones
test("accepts leap day *-2-29 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-2-29 00:00:00")).toBe(true);
});

test("accepts UTC literal *-*-* 00:00:00 UTC", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:00:00 UTC")).toBe(true);
});

test("accepts named timezone America/New_York", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:00:00 America/New_York")).toBe(true);
});

test("accepts explicit tz after date 2024-12-25 14:30:00 Europe/Paris", () => {
  expect(validateSystemdCalendarSpec("2024-12-25 14:30:00 Europe/Paris")).toBe(true);
});

// Multiple rules separated by newline
test("accepts two newline separated rules", () => {
  expect(
    validateSystemdCalendarSpec("Mon *-*-* 10:00:00\nFri *-*-* 15:00:00"),
  ).toBe(true);
});

test("accepts newline separated shortcuts", () => {
  expect(validateSystemdCalendarSpec("daily\nweekly")).toBe(true);
});

// Whitespace variations
test("accepts normal spacing *-*-* 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:00:00")).toBe(true);
});

test("accepts padded spacing  *-*-* 00:00:00 ", () => {
  expect(validateSystemdCalendarSpec(" *-*-* 00:00:00 ")).toBe(true);
});

test("accepts double space between date and time", () => {
  expect(validateSystemdCalendarSpec("*-*-*  00:00:00")).toBe(true);
});

test("accepts space after comma Mon, Fri *-*-* 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon, Fri *-*-* 09:00:00")).toBe(true);
});

// Special value expressions
test("accepts stepped minute spec *-*-* *:00/15:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* *:00/15:00")).toBe(true);
});

test("accepts stepped minute wildcard *-*-* *:*/10:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* *:*/10:00")).toBe(true);
});

test("accepts wildcard hours and minutes *:*:00", () => {
  expect(validateSystemdCalendarSpec("*:*:00")).toBe(true);
});

// Unsupported keyword-like expressions
test("rejects today keyword", () => {
  expect(validateSystemdCalendarSpec("today 14:00:00")).toBe(false);
});

test("rejects now keyword arithmetic", () => {
  expect(validateSystemdCalendarSpec("now + 1h")).toBe(false);
});

// Syntax errors
test("rejects hour overflow *-*-* 25:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 25:00:00")).toBe(false);
});

test("rejects minute overflow *-*-* 00:60:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:60:00")).toBe(false);
});

test("rejects invalid month *-13-* 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-13-* 00:00:00")).toBe(false);
});

test("rejects invalid day *-*-32 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-32 00:00:00")).toBe(false);
});

test("rejects invalid weekday Something *-*-* 00:00:00", () => {
  expect(validateSystemdCalendarSpec("Something *-*-* 00:00:00")).toBe(false);
});

// Format violations
test("rejects slash separated date 2024/12/25 14:30:00", () => {
  expect(validateSystemdCalendarSpec("2024/12/25 14:30:00")).toBe(false);
});

test("rejects hh:mm when full timestamp expected 14:30", () => {
  expect(validateSystemdCalendarSpec("14:30")).toBe(false);
});

test("rejects missing seconds *-*-* *:*", () => {
  expect(validateSystemdCalendarSpec("*-*-* *:*")).toBe(false);
});

test("rejects misplaced comma Mon,-*-* 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon,-*-* 09:00:00")).toBe(false);
});

test("rejects incomplete range Mon.. 09:00:00", () => {
  expect(validateSystemdCalendarSpec("Mon.. 09:00:00")).toBe(false);
});

// Values outside supported ranges
test("rejects hour equals 24 *-*-* 24:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-* 24:00:00")).toBe(false);
});

test("rejects seconds equals 60 *-*-* 00:00:60", () => {
  expect(validateSystemdCalendarSpec("*-*-* 00:00:60")).toBe(false);
});

test("rejects day zero *-*-0 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-*-0 00:00:00")).toBe(false);
});

test("rejects month zero *-0-* 00:00:00", () => {
  expect(validateSystemdCalendarSpec("*-0-* 00:00:00")).toBe(false);
});

// Missing or misplaced components
test("rejects missing time after date *-*-* ", () => {
  expect(validateSystemdCalendarSpec("*-*-* ")).toBe(false);
});

test("rejects swapped time and date 14:30:00 *-*-*", () => {
  expect(validateSystemdCalendarSpec("14:30:00 *-*-*")).toBe(false);
});

test("rejects empty string", () => {
  expect(validateSystemdCalendarSpec("")).toBe(false);
});

test("rejects whitespace only string", () => {
  expect(validateSystemdCalendarSpec("   ")).toBe(false);
});
