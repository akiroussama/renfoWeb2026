import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const requireNative = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const fakeProcess = { env: { GITHUB_WORKSPACE: root } };
const yml = fs
  .readFileSync(root + ".github/workflows/reviewers.yml", "utf8")
  .replace(/\r\n/g, "\n");
const raw = yml.split("          script: |\n")[1];
assert.ok(raw, "script introuvable");
const body = raw
  .split("\n")
  .map((l) => (l.startsWith("            ") ? l.slice(12) : l))
  .join("\n");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function run({ roster, author, draft }) {
  const requested = [];
  const warnings = [];
  const failures = [];
  const fakeFs = {
    readFileSync: () =>
      JSON.stringify({ participants: roster.map((login) => ({ login })) }),
  };
  const fakeRequire = (n) => (n === "fs" ? fakeFs : requireNative(n));
  const pr = {
    user: { login: author },
    base: { sha: "base" },
    state: "open",
    draft,
    requested_reviewers: [],
  };
  const github = {
    rest: {
      pulls: {
        get: async () => ({ data: pr }),
        listReviews: async () => ({ data: [] }),
        requestReviewers: async (a) => {
          requested.push(a);
        },
      },
      repos: { getContent: async () => ({ data: [] }) },
    },
    paginate: async () => [],
  };
  const context = {
    repo: { owner: "akiroussama", repo: "renfoWeb2026" },
    payload: { pull_request: { number: 1 } },
  };
  const core = {
    info: () => {},
    warning: (m) => warnings.push(String(m)),
    setFailed: (m) => failures.push(String(m)),
    summary: {
      addRaw() {
        return this;
      },
      addList() {
        return this;
      },
      write: async () => {},
    },
  };
  const fn = new AsyncFunction(
    "github",
    "context",
    "core",
    "require",
    "process",
    body,
  );
  await fn(github, context, core, fakeRequire, fakeProcess);
  return { requested, warnings, failures };
}
test("sélectionne deux relecteurs distincts hors auteur", async () => {
  const r = await run({
    roster: ["alice", "bob", "carol"],
    author: "alice",
    draft: false,
  });
  assert.equal(r.requested.length, 1);
  assert.deepEqual([...r.requested[0].reviewers].sort(), ["bob", "carol"]);
  assert.equal(r.failures.length, 0);
});
test("avertit quand effectif insuffisant pour désigner", async () => {
  const r = await run({ roster: [], author: "akiroussama", draft: false });
  assert.equal(r.requested.length, 0);
  assert.ok(r.warnings.length > 0);
});
test("ignore les brouillons sans demander de relecture", async () => {
  const r = await run({
    roster: ["alice", "bob", "carol"],
    author: "alice",
    draft: true,
  });
  assert.equal(r.requested.length, 0);
});
