export function runtimeError(
  version = process.version,
  flags = process.allowedNodeEnvironmentFlags,
) {
  const major = Number.parseInt(String(version).replace(/^v/, "").split(".")[0], 10);
  if (Number.isNaN(major) || major < 24) {
    return `Ce kit nécessite Node 24 (version détectée : ${version}). Installe Node 24, puis relance.`;
  }
  if (flags?.has?.("--permission")) return null;
  return `Ce kit nécessite Node 24 (version détectée : ${version}). Installe Node 24, puis relance.`;
}
export function ensureRuntime() {
  const err = runtimeError();
  if (err) {
    console.error(err);
    process.exit(1);
  }
}
