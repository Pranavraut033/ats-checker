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
          getTextContent: () => Promise.resolve({ items: [{ str: "hello" }] }),
        }),
      }),
    });

    const buf = new ArrayBuffer(4);
    const result = await extractTextFromPDF(buf);
    expect(result).toContain("hello");
    // should have received a Uint8Array, not the original ArrayBuffer
    expect(
      (getDocument as ReturnType<typeof vi.fn>).mock.calls[0][0].data
    ).toBeInstanceOf(Uint8Array);
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
                // x=100 keeps within-column gap <150px so column detection doesn't fire
                { str: "at ExampleCorp", transform: [1, 0, 0, 1, 100, 650] },
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

  async function mockShortDoc() {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: () => Promise.resolve({ items: [{ str: "hi" }] }),
        }),
      }),
    });
  }

  it("does not call ocrFallback when text-layer extraction is long enough", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: () =>
            Promise.resolve({ items: [{ str: "a".repeat(200) }] }),
        }),
      }),
    });

    const ocrFallback = vi.fn().mockResolvedValue("should not be used");
    const result = await extractTextFromPDF(new Uint8Array([0]), {
      ocrFallback,
    });
    expect(ocrFallback).not.toHaveBeenCalled();
    expect(result).toContain("a".repeat(200));
  });

  it("uses ocrFallback result when text-layer extraction is too short", async () => {
    await mockShortDoc();

    const ocrFallback = vi
      .fn()
      .mockResolvedValue("Recovered full resume text from OCR".repeat(5));
    const result = await extractTextFromPDF(new Uint8Array([0]), {
      ocrFallback,
    });
    expect(ocrFallback).toHaveBeenCalledOnce();
    expect(result).toContain("Recovered full resume text from OCR");
  });

  it("falls back to text-layer result when ocrFallback throws", async () => {
    await mockShortDoc();

    const ocrFallback = vi
      .fn()
      .mockRejectedValue(new Error("OCR engine unavailable"));
    const result = await extractTextFromPDF(new Uint8Array([0]), {
      ocrFallback,
    });
    expect(result).toBe("hi");
  });

  it("keeps text-layer result when ocrFallback returns shorter/equal text", async () => {
    await mockShortDoc();

    const ocrFallback = vi.fn().mockResolvedValue("x");
    const result = await extractTextFromPDF(new Uint8Array([0]), {
      ocrFallback,
    });
    expect(result).toBe("hi");
  });

  it("respects a custom minTextLength threshold", async () => {
    await mockShortDoc(); // "hi" is 2 chars

    const ocrFallback = vi.fn().mockResolvedValue("longer ocr text");
    const result = await extractTextFromPDF(new Uint8Array([0]), {
      ocrFallback,
      minTextLength: 1, // "hi".length (2) is already >= 1, so OCR shouldn't fire
    });
    expect(ocrFallback).not.toHaveBeenCalled();
    expect(result).toBe("hi");
  });

  it("throws a clear error when pdfjs-dist is not installed", async () => {
    vi.doMock("pdfjs-dist", () => {
      throw new Error("Module not found");
    });

    // Re-import to trigger fresh dynamic import inside the function
    vi.resetModules();
    const { extractTextFromPDF: fn } = await import("../src/pdf/index");

    await expect(fn(new Uint8Array([0]))).rejects.toThrow(
      "pdfjs-dist is required for PDF extraction"
    );
  });
});
