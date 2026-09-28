"use client";

import { useState } from "react";
import { markShared } from "@/app/actions/activities";

export function ShareButtons({
  activityId,
  whatsAppHref,
  text,
  pdfHref,
  canEdit,
}: {
  activityId: number;
  whatsAppHref: string;
  text: string;
  pdfHref: string;
  canEdit: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const shared = () => {
    if (canEdit) markShared(activityId).catch(() => {});
  };

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <a href={whatsAppHref} target="_blank" rel="noopener" onClick={shared} className="btn-primary">
        Share to the WhatsApp group
      </a>
      <a href={pdfHref} target="_blank" rel="noopener" onClick={shared} className="btn">
        Download PDF
      </a>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          await navigator.clipboard.writeText(text).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          shared();
        }}
      >
        {copied ? "Copied ✓" : "Copy as text"}
      </button>
    </div>
  );
}
