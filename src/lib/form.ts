export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

export function num(fd: FormData, key: string) {
  const n = Number(str(fd, key));
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}

export function optNum(fd: FormData, key: string) {
  const v = str(fd, key);
  return v === "" ? null : num(fd, key);
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}
