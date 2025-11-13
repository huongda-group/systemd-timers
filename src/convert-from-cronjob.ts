
type CronFieldType =
  | "minute"
  | "hour"
  | "dayOfMonth"
  | "month"
  | "dayOfWeek";

type CronFieldConfig = {
  min: number;
  max: number;
};

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DAY_OF_WEEK_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_OF_WEEK_ALIAS_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const CRON_MACRO_TO_ON_CALENDAR: Record<string, string> = {
  "@yearly": "yearly",
  "@annually": "annually",
  "@monthly": "monthly",
  "@weekly": "weekly",
  "@daily": "daily",
  "@midnight": "daily",
  "@hourly": "hourly",
};

const FIELD_CONFIG: Record<CronFieldType, CronFieldConfig> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 },
};

/**
 * Converts a traditional cron expression (as used by Kubernetes CronJob) into a
 * systemd OnCalendar string that can be validated by {@link validateSystemdCalendarSpec}.
 *
 * @example
 * convertFromCronjob("0 9-17 * * MON-FRI");
 * // -> "Mon..Fri *-*-* 9..17:00:00"
 *
 * @param cronExpression Cron expression containing five whitespace separated fields.
 * @returns A systemd OnCalendar string (or newline separated list) describing the same schedule.
 * @throws Error when the cron expression is empty or uses unsupported features.
 */
export default function convertFromCronjob(cronExpression: string): string {
  if (typeof cronExpression !== "string") {
    throw new Error("Cron expression must be a string.");
  }

  const trimmed = cronExpression.trim();
  if (!trimmed) {
    throw new Error("Cron expression cannot be empty.");
  }

  const lower = trimmed.toLowerCase();
  if (lower in CRON_MACRO_TO_ON_CALENDAR) {
    return CRON_MACRO_TO_ON_CALENDAR[lower];
  }
  if (lower === "@reboot") {
    throw new Error("@reboot cannot be expressed as an OnCalendar value.");
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(
      `Cron expression must contain exactly 5 fields (minute hour day-of-month month day-of-week); received ${fields.length}.`,
    );
  }

  const [minuteRaw, hourRaw, dayOfMonthRaw, monthRaw, dayOfWeekRaw] = fields;

  const minuteSpec = convertCronField(minuteRaw, "minute");
  const hourSpec = convertCronField(hourRaw, "hour");
  const dayOfMonthSpec = convertCronField(dayOfMonthRaw, "dayOfMonth");
  const monthSpec = convertCronField(monthRaw, "month");
  const dayOfWeekSpec = convertCronField(dayOfWeekRaw, "dayOfWeek");

  const timeSpec = `${formatTimeComponent(hourSpec)}:${formatTimeComponent(minuteSpec)}:00`;
  const dateSpec = `*-${monthSpec}-${dayOfMonthSpec}`;

  if (dayOfWeekSpec === "*") {
    return `${dateSpec} ${timeSpec}`;
  }

  if (dayOfMonthSpec === "*") {
    return `${dayOfWeekSpec} ${dateSpec} ${timeSpec}`;
  }

  const byDayOfMonth = `${dateSpec} ${timeSpec}`;
  const byDayOfWeek = `${dayOfWeekSpec} *-${monthSpec}-* ${timeSpec}`;

  return `${byDayOfMonth}\n${byDayOfWeek}`;
}

function convertCronField(value: string, type: CronFieldType): string {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`Missing ${type} field.`);
  }

  const segments = cleaned.split(",");
  return segments
    .map((segment) => segment.trim())
    .map((segment) => convertCronSegment(segment, type))
    .join(",");
}

function convertCronSegment(segment: string, type: CronFieldType): string {
  if (!segment) {
    throw new Error(`Invalid ${type} segment.`);
  }

  const pieces = segment.split("/");
  if (pieces.length > 2) {
    throw new Error(`Too many '/' characters in ${type} segment "${segment}".`);
  }

  const rangePart = pieces[0];
  const stepPart = pieces[1];

  const rangeSpec = convertCronRange(rangePart, type);
  if (!stepPart) {
    return rangeSpec;
  }

  if (!/^\d+$/.test(stepPart)) {
    throw new Error(`Step value "${stepPart}" inside ${type} must be positive integer.`);
  }
  if (Number(stepPart) === 0) {
    throw new Error(`Step value inside ${type} must be greater than zero.`);
  }

  return `${rangeSpec}/${Number(stepPart)}`;
}

function convertCronRange(range: string, type: CronFieldType): string {
  const normalized = range.trim();
  if (!normalized) {
    throw new Error(`Invalid ${type} range.`);
  }

  if (normalized === "*" || normalized === "?") {
    return "*";
  }

  if (normalized.includes("-")) {
    const [start, end] = normalized.split("-");
    if (!start || end === undefined) {
      throw new Error(`Malformed range "${range}" inside ${type} field.`);
    }
    const startValue = convertCronSingleValue(start, type);
    const endValue = convertCronSingleValue(end, type);
    return `${startValue}..${endValue}`;
  }

  return convertCronSingleValue(normalized, type);
}

function convertCronSingleValue(value: string, type: CronFieldType): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Invalid ${type} value.`);
  }

  switch (type) {
    case "month":
      return normalizeMonthValue(trimmed);
    case "dayOfWeek":
      return normalizeDayOfWeekValue(trimmed);
    default:
      return normalizeNumericValue(trimmed, type);
  }
}

function normalizeNumericValue(value: string, type: CronFieldType): string {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Unsupported token "${value}" in ${type} field.`);
  }

  const { min, max } = FIELD_CONFIG[type];
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw new Error(`${type} value "${value}" is outside the allowed range ${min}-${max}.`);
  }

  return String(numeric);
}

function normalizeMonthValue(value: string): string {
  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    const { min, max } = FIELD_CONFIG.month;
    if (numeric < min || numeric > max) {
      throw new Error(`Month value "${value}" is outside the allowed range ${min}-${max}.`);
    }
    return String(numeric);
  }

  const lookup = MONTH_NAME_TO_NUMBER[value.toLowerCase()];
  if (!lookup) {
    throw new Error(`Unknown month token "${value}".`);
  }
  return String(lookup);
}

function normalizeDayOfWeekValue(value: string): string {
  if (/^\d+$/.test(value)) {
    let numeric = Number(value);
    if (numeric === 7) {
      numeric = 0;
    }
    const { min, max } = FIELD_CONFIG.dayOfWeek;
    if (numeric < min || numeric > max - 1) {
      throw new Error(`Day-of-week value "${value}" must be between 0 and 7.`);
    }
    return DAY_OF_WEEK_NAMES[numeric];
  }

  const index = DAY_OF_WEEK_ALIAS_TO_INDEX[value.toLowerCase()];
  if (index === undefined) {
    throw new Error(`Unknown day-of-week token "${value}".`);
  }
  return DAY_OF_WEEK_NAMES[index];
}

function formatTimeComponent(component: string): string {
  return /^\d+$/.test(component) ? component.padStart(2, "0") : component;
}
