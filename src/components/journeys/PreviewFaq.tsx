"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/journey-preview";

export default function PreviewFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="jx-faq">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={i} className={`jx-faq__item${on ? " jx-faq__item--on" : ""}`}>
            <button type="button" className="jx-faq__q" aria-expanded={on} onClick={() => setOpen(on ? null : i)}>
              <span>{it.q}</span>
              <span className="jx-faq__mark" aria-hidden="true">{on ? "−" : "+"}</span>
            </button>
            {on && <p className="jx-faq__a">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
