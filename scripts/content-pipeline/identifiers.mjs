// APP-3.4: identifier format, at most 64 characters.
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_ID_LENGTH = 64;

/** @param {unknown} id */
export function isValidId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= MAX_ID_LENGTH && ID_PATTERN.test(id);
}
