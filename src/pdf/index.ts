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

    // Group items into lines by y-coordinate; within each line sort by x so
    // multi-column layouts read left-to-right instead of interleaved.
    // ponytail: x-bucketing handles 2-column resumes; true n-column needs
    // gap analysis on the x distribution — upgrade if section detection still fails.
    const Y_TOLERANCE = 2;
    type LineItem = { x: number; str: string };
    const lineMap: Map<number, LineItem[]> = new Map();
    const lineOrder: number[] = [];

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const str = item.str;
      const transform: number[] | undefined = Array.isArray(
        (item as { transform?: number[] }).transform
      )
        ? (item as { transform: number[] }).transform
        : undefined;

      if (!transform) {
        // No positional info (e.g. unit-test mocks) — append to last line or start one
        if (lineOrder.length === 0) {
          lineOrder.push(0);
          lineMap.set(0, []);
        }
        const key = lineOrder[lineOrder.length - 1];
        lineMap.get(key)!.push({ x: 0, str });
        continue;
      }

      const rawX = transform[4];
      const rawY = transform[5];

      // Find an existing line bucket within y-tolerance
      let bucketKey: number | undefined;
      for (const key of lineOrder) {
        if (Math.abs(key - rawY) <= Y_TOLERANCE) {
          bucketKey = key;
          break;
        }
      }
      if (bucketKey === undefined) {
        bucketKey = rawY;
        lineOrder.push(rawY);
        lineMap.set(rawY, []);
      }
      lineMap.get(bucketKey)!.push({ x: rawX, str });
    }

    // pdfjs y=0 is bottom of page — sort descending so top of page comes first
    lineOrder.sort((a, b) => b - a);

    const pageText = lineOrder
      .map((key) =>
        (lineMap.get(key) ?? [])
          .sort((a, b) => a.x - b.x)      // left-to-right within line
          .map((it) => it.str)
          .join(" ")
          .replace(/[^\S\n]+/g, " ")
          .trim()
      )
      .filter(Boolean)
      .join("\n");

    pages.push(pageText);
  }

  return pages.join("\n");
}
