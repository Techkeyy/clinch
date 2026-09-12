/** Read an environment variable NAME only. Never log values. */
export function envName(name: string): string | undefined {
  return process.env[name];
}
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}
