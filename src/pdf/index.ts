/**
 * Extract plain text from a PDF buffer.
 *
 * Requires `pdfjs-dist` to be installed (optional peerDependency):
 *   npm install pdfjs-dist
 *
 * @param data - Raw PDF bytes as Uint8Array or ArrayBuffer
 * @returns Extracted text, ready to pass as `resumeText` to analyzeResume
 */
export async function extractTextFromPDF(
  data: Uint8Array | ArrayBuffer
): Promise<string> {
  // ponytail: lazy import keeps core zero-dep; missing peer throws with clear message
  let pdfjsLib: typeof import("pdfjs-dist");
  try {
    pdfjsLib = await import("pdfjs-dist");
  } catch {
    throw new Error(
      "pdfjs-dist is required for PDF extraction. Install it: npm install pdfjs-dist"
    );
  }

  const bytes =
    data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    type RawItem = { x: number; y: number; str: string };
    const items: RawItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const transform: number[] | undefined = Array.isArray(
        (item as { transform?: number[] }).transform
      )
        ? (item as { transform: number[] }).transform
        : undefined;

      if (!transform) {
        // No positional info (unit-test mocks) — treat as single-column item
        items.push({ x: 0, y: 0, str: item.str });
      } else {
        items.push({ x: transform[4], y: transform[5], str: item.str });
      }
    }

    // Detect column boundary: find the largest x-gap among item start positions.
    // If it exceeds COLUMN_GAP_THRESHOLD, split into left / right columns and
    // process each independently so headers in different columns don't merge.
    // ponytail: single largest-gap heuristic handles the common 2-column resume;
    // n-column needs k-means on x-distribution — upgrade if this proves insufficient.
    // Column boundary heuristic: the largest gap in item x-positions.
    // Real PDF column gutters show as a gap >>80px; normal word spacing is <50px.
    // ponytail: magic number calibrated to PranavRaut2026.pdf (104px gap); raise
    // if single-column PDFs with wide indentation start getting falsely split.
    const COLUMN_GAP_THRESHOLD = 80;
    const xPositions = [...new Set(items.map((it) => Math.round(it.x)))].sort(
      (a, b) => a - b
    );

    let columnBoundary: number | null = null;
    let maxGap = 0;
    for (let j = 1; j < xPositions.length; j++) {
      const gap = xPositions[j] - xPositions[j - 1];
      if (gap > maxGap) {
        maxGap = gap;
        columnBoundary = (xPositions[j - 1] + xPositions[j]) / 2;
      }
    }
    if (maxGap < COLUMN_GAP_THRESHOLD) columnBoundary = null;

    const columns =
      columnBoundary !== null
        ? [
            items.filter((it) => it.x < columnBoundary!),
            items.filter((it) => it.x >= columnBoundary!),
          ]
        : [items];

    const columnTexts = columns.map((col) => renderColumn(col));
    pages.push(columnTexts.filter(Boolean).join("\n"));
  }

  return pages.join("\n");
}

function renderColumn(items: Array<{ x: number; y: number; str: string }>): string {
  const Y_TOLERANCE = 2;
  const lineMap: Map<number, Array<{ x: number; str: string }>> = new Map();
  const lineOrder: number[] = [];

  for (const { x, y, str } of items) {
    let bucketKey: number | undefined;
    for (const key of lineOrder) {
      if (Math.abs(key - y) <= Y_TOLERANCE) {
        bucketKey = key;
        break;
      }
    }
    if (bucketKey === undefined) {
      bucketKey = y;
      lineOrder.push(y);
      lineMap.set(y, []);
    }
    lineMap.get(bucketKey)!.push({ x, str });
  }

  // pdfjs y=0 is bottom of page — sort descending so top comes first
  lineOrder.sort((a, b) => b - a);

  return lineOrder
    .map((key) =>
      (lineMap.get(key) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str)
        .join(" ")
        .replace(/[^\S\n]+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}
