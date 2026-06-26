"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, sans-serif",
          background: "#faf8f3",
          color: "#211e19",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <div
            style={{
              width: "7rem",
              height: "7rem",
              borderRadius: "50%",
              background: "rgba(217,146,63,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 2rem",
              fontSize: "3rem",
            }}
          >
            !
          </div>

          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              color: "#19392a",
              margin: "0 0 0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#6d655a", lineHeight: 1.6, margin: "0 0 1rem" }}>
            A critical error occurred. You can try again or refresh the page.
          </p>

          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#6d655a", opacity: 0.6 }}>
              Error ID: {error.digest}
            </p>
          )}

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                height: "2.75rem",
                padding: "0 1.5rem",
                borderRadius: "9999px",
                background: "#24503a",
                color: "#faf8f3",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                height: "2.75rem",
                padding: "0 1.5rem",
                borderRadius: "9999px",
                background: "transparent",
                color: "#24503a",
                border: "1px solid rgba(36,80,58,0.3)",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
