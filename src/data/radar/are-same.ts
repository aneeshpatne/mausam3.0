export function areBuffersSame(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const hashA = Bun.hash(a);
  const hashB = Bun.hash(b);
  return hashA === hashB;
}
