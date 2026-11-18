"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search articles
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search articles…"
        className="w-40 rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-ring sm:w-56"
      />
      <button
        type="submit"
        className="sr-only"
      >
        Search
      </button>
    </form>
  );
}
