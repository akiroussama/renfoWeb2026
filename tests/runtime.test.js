import test from "node:test";
import assert from "node:assert/strict";
import { runtimeError } from "../scripts/lib/runtime.js";

test("exact error v20.20.2", () => {
  assert.strictEqual(
    runtimeError("v20.20.2", new Set()),
    "Ce kit nécessite Node 24 (version détectée : v20.20.2). Installe Node 24, puis relance.",
  );
});

test("v21 refusé même si flags contient --permission", () => {
  assert.strictEqual(
    runtimeError("v21.0.0", new Set(["--permission"])),
    "Ce kit nécessite Node 24 (version détectée : v21.0.0). Installe Node 24, puis relance.",
  );
});

test("v22 refusé même si flags contient --permission", () => {
  assert.strictEqual(
    runtimeError("v22.0.0", new Set(["--permission"])),
    "Ce kit nécessite Node 24 (version détectée : v22.0.0). Installe Node 24, puis relance.",
  );
});

test("v23 refusé même si flags contient --permission", () => {
  assert.strictEqual(
    runtimeError("v23.0.0", new Set(["--permission"])),
    "Ce kit nécessite Node 24 (version détectée : v23.0.0). Installe Node 24, puis relance.",
  );
});

test("v24 accepté avec --permission", () => {
  assert.strictEqual(runtimeError("v24.0.0", new Set(["--permission"])), null);
});

test("v24 refusé si flags ne contient pas --permission", () => {
  assert.strictEqual(
    runtimeError("v24.0.0", new Set()),
    "Ce kit nécessite Node 24 (version détectée : v24.0.0). Installe Node 24, puis relance.",
  );
});
