const DAY_NAME_ALIASES: Record<string, string> = {
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
};

const DAY_NAME_SET = new Set(Object.values(DAY_NAME_ALIASES));

const SPECIAL_KEYWORDS = new Set([
  "minutely",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semiannually",
  "semiannual",
  "semi-annually",
  "semi-annual",
  "yearly",
  "annually",
].map((item) => item.toLowerCase()));

const RANDOMIZATION_SPLIT = /\s+~\s+/;

const TIME_SPAN_SEGMENT =
  /(\d+(?:\.\d+)?)(usec|us|nsec|ns|msec|ms|seconds?|second|sec|s|minutes?|minute|min|m|hours?|hour|hr|h|days?|day|d|weeks?|week|w|months?|month|M|years?|year|y)?/gi;

type FieldConfig = {
  allowWildcard: boolean;
  allowTilde?: boolean;
  allowFraction?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
};

const YEAR_FIELD: FieldConfig = {
  allowWildcard: true,
  allowNegative: false,
  min: 0,
  max: 9999,
};

const MONTH_FIELD: FieldConfig = {
  allowWildcard: true,
  min: 1,
  max: 12,
};

const DAY_FIELD: FieldConfig = {
  allowWildcard: true,
  allowTilde: true,
  min: 1,
  max: 31,
};

const HOUR_FIELD: FieldConfig = {
  allowWildcard: true,
  min: 0,
  max: 23,
};

const MINUTE_FIELD: FieldConfig = {
  allowWildcard: true,
  min: 0,
  max: 59,
};

const SECOND_FIELD: FieldConfig = {
  allowWildcard: true,
  allowFraction: true,
  min: 0,
  max: 59,
};

export default function validateSystemdCalendarSpec(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  const expressions = splitExpressions(input);

  if (!expressions.length) {
    return false;
  }

  return expressions.every((expr) => validateExpression(expr));
}

function validateExpression(expression: string): boolean {
  let working = expression.trim();
  if (!working) {
    return false;
  }

  const randMatch = working.split(RANDOMIZATION_SPLIT);
  if (randMatch.length > 2) {
    return false;
  }

  let randomization: string | undefined;
  if (randMatch.length === 2) {
    const baseSpec = randMatch[0];
    const jitterSpec = randMatch[1];
    if (baseSpec === undefined || jitterSpec === undefined) {
      return false;
    }
    if (!isValidTimeSpan(jitterSpec)) {
      return false;
    }
    working = baseSpec;
    randomization = jitterSpec;
  }

  working = working.trim();
  if (!working) {
    return false;
  }

  let tzDirective: string | undefined;
  const tzMatch = working.match(/^TZ=([^\s]+)\s*/i);
  if (tzMatch) {
    const tzValue = tzMatch[1];
    if (!tzValue || !isValidTimeZoneLiteral(tzValue)) {
      return false;
    }
    tzDirective = tzValue;
    working = working.slice(tzMatch[0].length).trimStart();
  }

  if (!working) {
    return false;
  }

  const aliasMatch = working.match(/^([A-Za-z-]+)(?:\s+(.*))?$/);
  if (aliasMatch) {
    const aliasBase = aliasMatch[1];
    if (aliasBase) {
      const aliasKey = aliasBase.toLowerCase();
      if (SPECIAL_KEYWORDS.has(aliasKey)) {
        const remainder = (aliasMatch[2] ?? "").trim();
        if (remainder) {
          if (tzDirective) {
            return false;
          }
          if (!isValidTimeZoneLiteral(remainder)) {
            return false;
          }
        }
        return true;
      }
    }
  }

  const { daySpec, remainder } = consumeDaySpec(working);
  let rest = remainder.trim();

  if (!rest && daySpec) {
    return true;
  }

  if (!rest) {
    return false;
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return Boolean(daySpec);
  }

  let dateToken: string | undefined;
  let timeToken: string | undefined;
  let timezoneToken: string | undefined;
  let timezoneIndex = -1;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      return false;
    }

    if (!dateToken && !timeToken && isValidDateSpec(token)) {
      dateToken = token;
      continue;
    }

    if (!timeToken && token.includes(":")) {
      timeToken = token;
      continue;
    }

    if (!timezoneToken && isValidTimeZoneLiteral(token)) {
      timezoneToken = token;
      timezoneIndex = i;
      continue;
    }

    return false;
  }

  if (timezoneToken) {
    if (tzDirective) {
      return false;
    }
    if (!timeToken) {
      return false;
    }
    if (timezoneIndex !== tokens.length - 1) {
      return false;
    }
  }

  if (dateToken && !timeToken) {
    return false;
  }

  const isTimeOnly =
    Boolean(timeToken) &&
    !daySpec &&
    !dateToken &&
    !timezoneToken &&
    !tzDirective;

  if (timeToken && !isValidTimeSpec(timeToken, { timeOnly: isTimeOnly })) {
    return false;
  }

  if (!timeToken && !daySpec) {
    return false;
  }

  return true;
}

function consumeDaySpec(value: string): { daySpec?: string; remainder: string } {
  const trimmed = value.trimStart();
  if (!trimmed) {
    return { remainder: "" };
  }

  const firstChar = trimmed.charAt(0);
  if (!/[A-Za-z]/.test(firstChar)) {
    return { remainder: trimmed };
  }

  let idx = 0;
  while (
    idx < trimmed.length &&
    /[A-Za-z.,\s]/.test(trimmed.charAt(idx))
  ) {
    idx += 1;
  }

  const candidate = trimmed.slice(0, idx).trim();
  if (candidate && isValidDaySpec(candidate)) {
    return { daySpec: candidate, remainder: trimmed.slice(idx).trimStart() };
  }

  return { remainder: trimmed };
}

function isValidDaySpec(spec: string): boolean {
  const cleaned = spec.replace(/\s+/g, "");
  if (!cleaned) {
    return false;
  }
  const withoutTrailingComma = cleaned.replace(/,+$/, "");
  if (!withoutTrailingComma) {
    return false;
  }

  return withoutTrailingComma.split(",").every((part) => {
    let atom = part.trim();
    if (!atom) {
      return false;
    }

    const slashIdx = atom.indexOf("/");
    if (slashIdx !== -1) {
      const step = atom.slice(slashIdx + 1);
      if (!/^\d+$/.test(step) || Number(step) <= 0) {
        return false;
      }
      atom = atom.slice(0, slashIdx);
    }

    if (atom === "*" || atom === "") {
      return atom === "*";
    }

    if (atom.includes("..")) {
      const bounds = atom.split("..");
      if (bounds.length !== 2) {
        return false;
      }
      const start = bounds[0];
      const end = bounds[1];
      if (!start || !end) {
        return false;
      }
      return isValidDayName(start) && isValidDayName(end);
    }

    return isValidDayName(atom);
  });
}

function isValidDayName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (/^[0-7]$/.test(normalized)) {
    return true;
  }

  if (DAY_NAME_ALIASES[normalized]) {
    return true;
  }

  const short = normalized.slice(0, 3);
  return Boolean(DAY_NAME_ALIASES[short]);
}

function isValidDateSpec(token: string): boolean {
  if (!token) {
    return false;
  }

  const weekPattern =
    /^(?:\*|[+-]?\d{4})-W(?:\*|\d{1,2})(?:-(?:\*|\d))?$/i;
  if (weekPattern.test(token)) {
    return true;
  }

  const parts = token.split("-");
  if (parts.length === 0 || parts.length > 3) {
    return false;
  }

  let year = "*";
  let month = "*";
  let day = "*";

  if (parts.length === 3) {
    year = parts[0] ?? "";
    month = parts[1] ?? "";
    day = parts[2] ?? "";
  } else if (parts.length === 2) {
    month = parts[0] ?? "";
    day = parts[1] ?? "";
  } else {
    day = parts[0] ?? "";
  }

  const { resolvedMonth, resolvedDay } = normalizeTilde(month, day);
  month = resolvedMonth;
  day = resolvedDay;

  return (
    validateField(year, YEAR_FIELD) &&
    validateField(month, MONTH_FIELD) &&
    validateField(day, DAY_FIELD)
  );
}

function normalizeTilde(month: string, day: string): {
  resolvedMonth: string;
  resolvedDay: string;
} {
  const tildeIndex = day.indexOf("~");
  if (tildeIndex === -1) {
    return { resolvedMonth: month, resolvedDay: day };
  }

  const prefix = day.slice(0, tildeIndex);
  const suffix = day.slice(tildeIndex + 1);
  if (!suffix) {
    return { resolvedMonth: month, resolvedDay: day };
  }

  const tildeDay = `~${suffix}`;
  if (month === "*" && prefix && prefix !== "*") {
    return { resolvedMonth: prefix, resolvedDay: tildeDay };
  }

  return { resolvedMonth: month, resolvedDay: tildeDay };
}

function validateField(value: string, config: FieldConfig): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed.split(",").every((segment) => validateFieldAtom(segment, config));
}

function validateFieldAtom(segment: string, config: FieldConfig): boolean {
  const atom = segment.trim();
  if (!atom) {
    return false;
  }

  const pieces = atom.split("/");
  if (pieces.length > 2) {
    return false;
  }

  const range = pieces[0];
  const step = pieces[1];
  if (!range) {
    return false;
  }

  if (step && !isValidStep(step, Boolean(config.allowFraction))) {
    return false;
  }

  if (range.includes("..")) {
    const bounds = range.split("..");
    if (bounds.length !== 2) {
      return false;
    }
    const start = bounds[0];
    const end = bounds[1];
    if (!start || !end) {
      return false;
    }
    return isValidValue(start, config) && isValidValue(end, config);
  }

  return isValidValue(range, config);
}

function isValidStep(step: string, allowFraction: boolean): boolean {
  const regex = allowFraction ? /^\d+(?:\.\d+)?$/ : /^\d+$/;
  if (!regex.test(step)) {
    return false;
  }
  return Number(step) > 0;
}

function isValidValue(value: string, config: FieldConfig): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed === "*") {
    return config.allowWildcard;
  }

  let working = trimmed;
  let usesTilde = false;
  if (working.startsWith("~")) {
    if (!config.allowTilde) {
      return false;
    }
    usesTilde = true;
    working = working.slice(1);
    if (!working) {
      return false;
    }
  }

  const allowFraction = Boolean(config.allowFraction);
  const allowNegative = Boolean(config.allowNegative);
  const numberRegex = allowFraction
    ? allowNegative
      ? /^[+-]?\d+(?:\.\d+)?$/
      : /^\d+(?:\.\d+)?$/
    : allowNegative
      ? /^[+-]?\d+$/
      : /^\d+$/;
  if (!numberRegex.test(working)) {
    return false;
  }

  const numeric = Number(working);
  if (!Number.isFinite(numeric)) {
    return false;
  }

  if (!usesTilde) {
    if (config.min !== undefined && numeric < config.min) {
      return false;
    }
    if (config.max !== undefined && numeric > config.max) {
      return false;
    }
  } else if (numeric <= 0) {
    return false;
  }

  return true;
}

type TimeValidationOptions = {
  timeOnly: boolean;
};

function isValidTimeSpec(
  token: string,
  options: TimeValidationOptions
): boolean {
  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }

  const commaParts = splitCommaParts(trimmed);
  const treatAsList =
    commaParts.length > 1 && commaParts.every((part) => part.includes(":"));

  if (treatAsList) {
    return commaParts.every((part) =>
      isValidTimeAtom(part.trim(), options)
    );
  }

  return isValidTimeAtom(trimmed, options);
}

function isValidTimeAtom(atom: string, options: TimeValidationOptions): boolean {
  const parts = atom.split(":");
  if (parts.length < 2 || parts.length > 3) {
    return false;
  }

  const hourSpec = parts[0];
  const minuteSpec = parts[1];
  const secondSpec = parts[2];

  if (!hourSpec || !minuteSpec) {
    return false;
  }

  if (!validateField(hourSpec, HOUR_FIELD)) {
    return false;
  }
  if (!validateField(minuteSpec, MINUTE_FIELD)) {
    return false;
  }

  if (parts.length === 3) {
    if (!secondSpec) {
      return false;
    }
    return validateField(secondSpec, SECOND_FIELD);
  }

  if (containsFlexibleMinute(minuteSpec)) {
    return false;
  }

  if (options.timeOnly && !isZeroMinuteList(minuteSpec)) {
    return false;
  }

  return true;
}

function isValidTimeZoneLiteral(token: string): boolean {
  if (!token) {
    return false;
  }

  if (/^TZ=/i.test(token)) {
    return false;
  }

  if (/^(?:UTC|GMT|Z)(?:[+-]\d{1,2}(?::?\d{2})?)?$/i.test(token)) {
    return true;
  }

  if (/^[A-Za-z]+(?:\/[A-Za-z0-9_\-]+)+$/.test(token)) {
    return true;
  }

  if (/^[A-Za-z]{3,}[A-Za-z0-9_\-]*$/.test(token)) {
    const short = token.slice(0, 3).toLowerCase();
    return !DAY_NAME_SET.has(short);
  }

  return false;
}

function isValidTimeSpan(value: string): boolean {
  const input = value.trim();
  TIME_SPAN_SEGMENT.lastIndex = 0;
  if (!input) {
    return false;
  }

  let idx = 0;
  while (idx < input.length) {
    const currentChar = input.charAt(idx);
    if (/\s/.test(currentChar)) {
      idx += 1;
      continue;
    }

    TIME_SPAN_SEGMENT.lastIndex = idx;
    const match = TIME_SPAN_SEGMENT.exec(input);
    if (!match || match.index !== idx) {
      TIME_SPAN_SEGMENT.lastIndex = 0;
      return false;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) {
      TIME_SPAN_SEGMENT.lastIndex = 0;
      return false;
    }

    idx = TIME_SPAN_SEGMENT.lastIndex;
  }

  TIME_SPAN_SEGMENT.lastIndex = 0;
  return true;
}

function splitCommaParts(value: string): string[] {
  return value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function containsFlexibleMinute(value: string): boolean {
  return /[*~/]/.test(value) || value.includes("..");
}

function isZeroMinuteList(value: string): boolean {
  const parts = splitCommaParts(value);
  if (!parts.length) {
    return false;
  }
  return parts.every((part) => /^\d+$/.test(part) && Number(part) === 0);
}

function splitExpressions(input: string): string[] {
  const normalized = input.replace(/\r?\n/g, (match, offset, source) => {
    let prevIndex = offset - 1;
    while (prevIndex >= 0 && /\s/.test(source.charAt(prevIndex))) {
      prevIndex -= 1;
    }
    const prevChar = prevIndex >= 0 ? source.charAt(prevIndex) : "";
    if (prevChar === "," || prevChar === ".") {
      return " ";
    }
    return "\n";
  });

  return normalized
    .split(/(?:;|\n)+/)
    .map((expr) => expr.trim())
    .filter(Boolean);
}
