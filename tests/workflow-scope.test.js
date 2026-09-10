import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const yml = readFileSync(
  new URL("../.github/workflows/scope.yml", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");
const body = yml
  .split("          script: |\n")[1]
  .split("\n")
  .map((l) => l.slice(12))
  .join("\n");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = async (files) => {
  const states = [];
  const failed = [];
  const github = {
    rest: {
      pulls: {
        get: async () => ({
          data: {
            user: { login: "alice" },
            head: { sha: "abc" },
            changed_files: files.length,
          },
        }),
        listFiles: async () => ({ data: files }),
      },
      repos: {
        createCommitStatus: async (o) => {
          states.push(o.state);
        },
      },
    },
  };
  const context = {
    repo: { owner: "akiroussama", repo: "renfoWeb2026" },
    issue: { number: 1 },
  };
  const core = { info: () => {}, setFailed: (m) => failed.push(m) };
  const fakeProcess = {
    env: { ...process.env, GITHUB_WORKSPACE: repoRoot, GITHUB_RUN_ID: "1" },
  };
  const fn = new AsyncFunction(
    "github",
    "context",
    "core",
    "require",
    "process",
    body,
  );
  await fn(github, context, core, require, fakeProcess);
  return { states, failed };
};
test("modifié students/alice/persona.js => succès sans échec", async () => {
  const { states, failed } = await run([
    { filename: "students/alice/persona.js", status: "modified" },
  ]);
  assert.equal(states.at(-1), "success");
  assert.equal(failed.length, 0);
});
test("renommé students/alice/persona.js depuis docs/x.js => échec", async () => {
  const { states } = await run([
    {
      filename: "students/alice/persona.js",
      status: "renamed",
      previous_filename: "docs/x.js",
    },
  ]);
  assert.equal(states.at(-1), "failure");
});
