"use client";

import { useState } from "react";
import { btnSecondary } from "@/components/ui/styles";

export function CopyButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "✓ Copied" : "Copy link"}
    </button>
  );
}
