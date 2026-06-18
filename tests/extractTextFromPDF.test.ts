import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdfjs-dist before importing the module under test
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
}));

import { extractTextFromPDF } from "../src/pdf/index";

describe("extractTextFromPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins page text and normalizes whitespace", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: vi.fn().mockImplementation((n: number) =>
          Promise.resolve({
            getTextContent: () =>
              Promise.resolve({
                items: [
                  { str: n === 1 ? "Software  Engineer" : "TypeScript  React" },
                ],
              }),
          })
        ),
      }),
    });

    const result = await extractTextFromPDF(new Uint8Array([0]));
    expect(result).toContain("Software Engineer");
    expect(result).toContain("TypeScript React");
    expect(result).not.toMatch(/ {2,}/);
  });

  it("accepts ArrayBuffer as well as Uint8Array", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: () =>
            Promise.resolve({ items: [{ str: "hello" }] }),
        }),
      }),
    });

    const buf = new ArrayBuffer(4);
    const result = await extractTextFromPDF(buf);
    expect(result).toContain("hello");
    // should have received a Uint8Array, not the original ArrayBuffer
    expect((getDocument as ReturnType<typeof vi.fn>).mock.calls[0][0].data).toBeInstanceOf(Uint8Array);
  });

  it("reconstructs lines from y-coordinates", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: () =>
            Promise.resolve({
              items: [
                { str: "EXPERIENCE", transform: [1, 0, 0, 1, 50, 700] },
                { str: "Software Engineer", transform: [1, 0, 0, 1, 50, 650] },
                { str: "at ExampleCorp", transform: [1, 0, 0, 1, 200, 650] },
              ],
            }),
        }),
      }),
    });

    const result = await extractTextFromPDF(new Uint8Array([0]));
    const lines = result.split("\n");
    expect(lines[0]).toBe("EXPERIENCE");
    expect(lines[1]).toBe("Software Engineer at ExampleCorp");
  });

  it("throws a clear error when pdfjs-dist is not installed", async () => {
    vi.doMock("pdfjs-dist", () => { throw new Error("Module not found"); });

    // Re-import to trigger fresh dynamic import inside the function
    vi.resetModules();
    const { extractTextFromPDF: fn } = await import("../src/pdf/index");

    await expect(fn(new Uint8Array([0]))).rejects.toThrow(
      "pdfjs-dist is required for PDF extraction"
    );
  });
});
