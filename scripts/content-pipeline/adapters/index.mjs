import { csvAdapter } from "./csv-adapter.mjs";
import { esmAdapter } from "./esm-adapter.mjs";
import { jsonAdapter } from "./json-adapter.mjs";

// APP-6.4: one shared list — adding a fourth format means adding one
// adapter here and nowhere else.
export const adapters = [csvAdapter, jsonAdapter, esmAdapter];

export { csvAdapter, jsonAdapter, esmAdapter };
