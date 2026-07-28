"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: replaces the whole document, so it must render its own
 * <html>/<body> and cannot use the app's providers or components. Without it a
 * root-layout failure shows Next's stock English LTR error screen — to a law
 * firm's own client, in the worst case.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>אירעה שגיאה במערכת</h1>
        <p style={{ maxWidth: "28rem", color: "#475569", margin: 0 }}>
          לא הצלחנו לטעון את הדף. נסו לרענן, ואם הבעיה חוזרת פנו לתמיכה.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#1e3a5f",
            color: "#fff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          נסו שוב
        </button>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
            מזהה תקלה: <span dir="ltr">{error.digest}</span>
          </p>
        )}
        <a
          href="https://win-solutions.co.il"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.75rem", color: "#94a3b8" }}
        >
          מבית win-solutions.co.il
        </a>
      </body>
    </html>
  );
}
