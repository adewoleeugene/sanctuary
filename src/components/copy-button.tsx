"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "btn",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older phones: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}
