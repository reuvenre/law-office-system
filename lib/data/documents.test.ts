import { describe, it, expect } from "vitest";
import { documentDisposition } from "./documents";

describe("documentDisposition", () => {
  it("renders the everyday legal file types in the browser", () => {
    for (const type of ["application/pdf", "image/png", "image/jpeg", "text/plain"]) {
      expect(documentDisposition(type)).toEqual({
        contentType: type,
        disposition: "inline",
      });
    }
  });

  it("forces a download for scriptable types — the uploader picks this value", () => {
    for (const type of [
      "text/html",
      "image/svg+xml",
      "application/xhtml+xml",
      "application/javascript",
    ]) {
      expect(documentDisposition(type)).toEqual({
        contentType: "application/octet-stream",
        disposition: "attachment",
      });
    }
  });

  it("normalizes parameters and casing before matching", () => {
    expect(documentDisposition("APPLICATION/PDF; charset=utf-8").disposition).toBe("inline");
    // …and cannot be smuggled past the allow-list by appending one.
    expect(documentDisposition("text/html; charset=utf-8").contentType).toBe(
      "application/octet-stream"
    );
  });

  it("treats a missing or unknown type as an opaque attachment", () => {
    expect(documentDisposition(null).disposition).toBe("attachment");
    expect(documentDisposition("").disposition).toBe("attachment");
    expect(documentDisposition("application/vnd.oasis.opendocument.text").disposition).toBe(
      "attachment"
    );
  });
});
