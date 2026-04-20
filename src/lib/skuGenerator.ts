export function generateSKU(
  categoryName: string | null,
  productName: string,
  existingSKUs: string[]
): string {
  const catPrefix = (categoryName || "GEN")
    .replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const namePrefix = productName
    .replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const base = `${catPrefix}-${namePrefix}`;
  let seq = 1;
  while (existingSKUs.includes(`${base}-${String(seq).padStart(3, "0")}`)) {
    seq++;
  }
  return `${base}-${String(seq).padStart(3, "0")}`;
}
