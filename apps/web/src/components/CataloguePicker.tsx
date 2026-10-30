"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CONCENTRATION_LABELS, fragranceDisplayName, type Fragrance, type House } from "@fragrance/core";
import { Field, inputClass } from "@/components/Field";

// What a form starts with: a catalogue match, or text the seller typed.
export interface CataloguePick {
  fragranceId?: string;
  houseId?: string;
  house?: string;
  name?: string;
}

// Hidden form values it submits:
//   house, name      the catalogue spelling, or what was typed
//   fragranceId      empty when not matched
//   catalogueState   "matched", "typed" (Can't find it), or "unpicked" (typed but nothing chosen yet)
export const UNPICKED_ERROR = "Choose your fragrance from the suggestions, or pick “Can't find it? Type it in”.";

type Suggestion = { id: string; label: string; detail?: string };

function useSuggestions(query: string, houseId: string | undefined, enabled: boolean) {
  const [items, setItems] = useState<{ houses: House[]; fragrances: Fragrance[] }>({ houses: [], fragrances: [] });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q: query });
      if (houseId) params.set("house", houseId);
      try {
        const res = await fetch(`/api/catalogue/search?${params}`, { signal: controller.signal });
        if (res.ok) setItems(await res.json());
      } catch {
        // Aborted or offline: keep the last suggestions.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, houseId, enabled]);
  return items;
}

function SuggestionInput({
  label,
  value,
  onType,
  suggestions,
  onPick,
  disabled,
  placeholder,
  autoFocusKey,
}: {
  label: string;
  value: string;
  onType: (text: string) => void;
  suggestions: Suggestion[];
  onPick: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocusKey?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const showList = open && suggestions.length > 0 && !disabled;

  // Moves focus here when the step before it is done (a house was picked).
  useEffect(() => {
    if (autoFocusKey) {
      input.current?.focus();
      setOpen(true);
    }
  }, [autoFocusKey]);

  function pick(id: string) {
    onPick(id);
    setOpen(false);
  }

  return (
    <Field label={label}>
      <div className="relative">
        <input
          ref={input}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            onType(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(suggestions[active].id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`${inputClass} w-full disabled:bg-panel disabled:text-muted`}
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s.id);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 ${i === active ? "bg-brand/10" : ""}`}
              >
                <span className="font-semibold">{s.label}</span>
                {s.detail && <span className="text-muted"> · {s.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

// The Brand and Fragrance name fields: pick from the catalogue, or type it in (spec 002, AC-1).
export function CataloguePicker({
  initial,
  allowTyping = true,
  fragranceLabel = "Fragrance name",
}: {
  initial?: CataloguePick;
  allowTyping?: boolean;
  fragranceLabel?: string;
}) {
  const startsTyped = allowTyping && Boolean(initial?.house) && !initial?.fragranceId;
  const [typing, setTyping] = useState(startsTyped);
  const [houseText, setHouseText] = useState(initial?.house ?? "");
  const [houseId, setHouseId] = useState(initial?.fragranceId ? initial.houseId : undefined);
  const [nameText, setNameText] = useState(initial?.name ?? "");
  const [fragranceId, setFragranceId] = useState(initial?.fragranceId);
  const [focusFragrance, setFocusFragrance] = useState<string>();

  const houseResults = useSuggestions(houseText, undefined, !typing && !houseId);
  const fragranceResults = useSuggestions(nameText === "" || fragranceId ? "" : nameText, houseId, !typing && Boolean(houseId));

  const houseSuggestions: Suggestion[] = houseResults.houses.map((h) => ({ id: h.id, label: h.name }));
  const fragranceSuggestions: Suggestion[] = fragranceResults.fragrances.map((f) => ({
    id: f.id,
    label: f.name,
    detail: [CONCENTRATION_LABELS[f.concentration], f.launchYear].filter(Boolean).join(", "),
  }));

  const state = typing ? "typed" : fragranceId ? "matched" : "unpicked";

  return (
    <>
      <input type="hidden" name="house" value={houseText.trim()} />
      <input type="hidden" name="name" value={nameText.trim()} />
      <input type="hidden" name="fragranceId" value={typing ? "" : (fragranceId ?? "")} />
      <input type="hidden" name="catalogueState" value={state} />

      {typing ? (
        <>
          <Field label="Brand">
            <input
              value={houseText}
              onChange={(e) => setHouseText(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={fragranceLabel}>
            <input value={nameText} onChange={(e) => setNameText(e.target.value)} required className={inputClass} />
          </Field>
        </>
      ) : (
        <>
          <SuggestionInput
            label="Brand"
            value={houseText}
            placeholder="Start typing, for example Dior"
            onType={(text) => {
              setHouseText(text);
              setHouseId(undefined);
              setFragranceId(undefined);
              setNameText("");
            }}
            suggestions={houseSuggestions}
            onPick={(id) => {
              const house = houseResults.houses.find((h) => h.id === id);
              if (!house) return;
              setHouseText(house.name);
              setHouseId(house.id);
              setFocusFragrance(house.id);
            }}
          />
          <SuggestionInput
            label={fragranceLabel}
            value={nameText}
            disabled={!houseId}
            placeholder={houseId ? "Start typing, or pick from the list" : "Choose the brand first"}
            autoFocusKey={focusFragrance}
            onType={(text) => {
              setNameText(text);
              setFragranceId(undefined);
            }}
            suggestions={fragranceSuggestions}
            onPick={(id) => {
              const fragrance = fragranceResults.fragrances.find((f) => f.id === id);
              if (!fragrance) return;
              setNameText(fragranceDisplayName(fragrance));
              setFragranceId(fragrance.id);
            }}
          />
        </>
      )}

      {allowTyping && (
        <div className="text-[13px] sm:col-span-2">
          {typing ? (
            <p className="rounded-xl bg-panel px-3 py-2 text-muted">
              <span className="font-bold text-ink">Not yet matched.</span> It can still go live. Our team will add it to
              the catalogue or match it to an existing one.{" "}
              <button
                type="button"
                onClick={() => {
                  setTyping(false);
                  setHouseId(undefined);
                  setFragranceId(undefined);
                }}
                className="font-bold text-brand underline"
              >
                Pick from the list instead
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setTyping(true)} className="font-bold text-brand underline">
              Can&apos;t find it? Type it in
            </button>
          )}
        </div>
      )}
    </>
  );
}
