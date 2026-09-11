import test from "node:test";
import assert from "node:assert/strict";
import { runtimeError } from "../scripts/lib/runtime.js";

test("exact error v20.20.2", () => {
  assert.strictEqual(
    runtimeError("v20.20.2", new Set()),
    "Ce kit nécessite Node 24 (version détectée : v20.20.2). Installe Node 24, puis relance.",
  );
});

test("permitted capability under 22/24/26", () => {
  assert.strictEqual(runtimeError("v22.0.0", new Set(["--permission"])), null);
  assert.strictEqual(runtimeError("v24.0.0", new Set(["--permission"])), null);
  assert.strictEqual(runtimeError("v26.0.0", new Set(["--permission"])), null);
});

test("absence capability even under 24 blocks", () => {
  assert.strictEqual(
    runtimeError("v24.0.0", new Set()),
    "Ce kit nécessite Node 24 (version détectée : v24.0.0). Installe Node 24, puis relance.",
  );
});
