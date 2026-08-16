import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const DISCOVERY_BUILD_SOURCES = [
  "src/app/dashboard/discovery/music/page.tsx",
  "src/app/dashboard/discovery/near-you/page.tsx",
  "src/app/dashboard/discovery/page.tsx",
  "src/app/dashboard/discovery/sports/page.tsx",
  "src/lib/discovery/providers/events.ts",
] as const;

test("Discovery build sources contain valid TypeScript and JSX syntax", async () => {
  for (const fileName of DISCOVERY_BUILD_SOURCES) {
    const source = await readFile(fileName, "utf8");
    const result = ts.transpileModule(source, {
      fileName,
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.Preserve,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    });
    const syntaxErrors = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );

    assert.deepEqual(
      syntaxErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
      [],
      `${fileName} contains invalid TypeScript or JSX syntax`,
    );
  }
});
