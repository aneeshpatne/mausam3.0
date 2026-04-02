export function areBuffersSame(
  a: ArrayBufferView,
  b: ArrayBufferView,
): boolean {
  const hashA = Bun.hash(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  const hashB = Bun.hash(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  return hashA === hashB;
}
