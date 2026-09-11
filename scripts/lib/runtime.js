export function runtimeError(
  version = process.version,
  flags = process.allowedNodeEnvironmentFlags,
) {
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
