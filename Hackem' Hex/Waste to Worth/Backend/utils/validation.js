function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export function parseFiniteNumber(value, { name = "value", min = -Infinity, max = Infinity } = {}) {
  if (value === "" || value === null || value === undefined) {
    throw validationError(`${name} must be a number`);
  }

  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw validationError(`${name} must be a number between ${min} and ${max}`);
  }

  return number;
}

export function parseLimit(value, defaultValue = 20, max = 100) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const limit = parseFiniteNumber(value, { name: "limit", min: 1, max });
  if (!Number.isInteger(limit)) throw validationError("limit must be an integer");
  return limit;
}

export function requireText(value, name, { maxLength = 500 } = {}) {
  if (typeof value !== "string" || !value.trim()) {
    throw validationError(`${name} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) throw validationError(`${name} is too long`);
  return text;
}

export function optionalText(value, name, { maxLength = 500 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, name, { maxLength });
}
