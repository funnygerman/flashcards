/**
 * D2 / APP-3.6: the build fails naming every offending file and identifier,
 * not just the first one it hits, so a single run surfaces the whole list of
 * problems to fix.
 */
export class ContentBuildError extends Error {
  /** @param {string[]} issues */
  constructor(issues) {
    super(`content build failed with ${issues.length} issue(s):\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "ContentBuildError";
    this.issues = issues;
  }
}
