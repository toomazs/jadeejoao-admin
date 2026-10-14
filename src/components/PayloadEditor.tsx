import { Plus, Trash2 } from "lucide-react";

import { ChapterPhotosSlot } from "./ChapterPhotos";
import { IconField } from "./IconField";
import { GiftListSlot } from "./GiftList";
import { DateTimeField, ImageField } from "./fields";
import { createContext, use, useRef, useState } from "react";

import { MarkdownField } from "./MarkdownField";
import { Accordion, Button, Checkbox, DateField } from "./ui";
import {
  FIELD_ANCHOR,
  FIELD_ONLY_IF,
  FIELD_PT,
  LIST_ITEM_ANCHOR,
  SECTION_ANCHOR,
  SECTION_GROUPS,
} from "../lib/labels-fields";

/**
 * An editor that reads the payload rather than a hand-written form per section.
 *
 * There are nine sections and their JSONB payloads differ a lot — one holds a
 * programme of eleven items, another two dress-code looks, another a list of
 * hotels. Writing nine forms means nine things to update every time the API
 * adds a field, and nine chances for the panel to quietly stop showing
 * something the couple can no longer edit.
 *
 * So the shape decides the controls: text for strings, a switch for booleans,
 * a repeatable group for arrays. What it costs is a generic look; what it buys
 * is that a new field in the API appears here without anyone doing anything.
 */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Lets a field ask the preview to be pointed at, without threading a callback
 * through every level of a recursive editor.
 */
/** Lets any accordion move the preview to whatever it just opened. */
export const FocusContext = createContext<((anchor: string) => void) | null>(null)

export const PickContext = createContext<{
  picking: string | null;
  /** The handler travels with the request, so no field owns shared state. */
  start: (target: string, onPicked: (x: number, y: number) => void) => void;
  cancel: () => void;
} | null>(null);

interface EditorProps {
  value: Json;
  onChange: (next: Json) => void;
  /** Dotted path, used for labels and for keying inputs. */
  path?: string;
  /**
   * The keys an entry of this list can hold, in payload order, and which of
   * them are optional. Borrowed from the sibling entries — the only
   * description of the shape the panel has — so a field the couple has not
   * filled in still appears where it belongs, instead of only existing as a
   * button in a pile at the bottom.
   */
  shape?: string[];
  optional?: ReadonlySet<string>;
  /** An empty value of the right type per key, for the ones not filled in. */
  blanks?: Record<string, Json>;
}

/**
 * A payload path with the grouping markers taken back out.
 *
 * A group of several keys hands its children a path like
 * `our_story::Momentos do álbum.moments`, because the child must not look the
 * section's groups up again and recurse. That marker is a panel detail, and the
 * anchor map speaks payload paths — so the album's list stopped matching
 * `our_story.moments` and opening a frame moved nothing at all.
 */
const anchorPath = (path: string): string => path.replace(/::[^.]*/g, "");

/** Keys whose value is prose rather than a phrase. */
const LONG_TEXT = /body|bio|letter|notes|description|attire|parking/i;
/** Keys holding a photograph the couple should be able to replace and crop. */
const IMAGE = /image_url|photo_url|logo_url/i;
/** Keys holding a moment in time rather than a string that looks like one. */
const DATETIME = /datetime/i;
/**
 * Keys holding a real calendar date. `date` is NOT here: the album's is a
 * freeform line — "2021", "1º de agosto de 2020" — and a calendar cannot hold
 * that, so routing it there showed a dash where the couple's own words were.
 *
 * Matched whole, never by substring: `event_date` earns the calendar, and it
 * only stopped getting one when the payload renamed `event_datetime`, which
 * quietly dropped the wedding day back to a box you type 2027-08-07 into.
 */
const DATE_ONLY = /^(deadline|event_date)$/i;

function humanize(key: string): string {
  return (
    FIELD_PT[key] ??
    key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

/** Short lines the site still renders as markdown — the Catarina caption. */
const SHORT_MARKDOWN = /label|attire/i;

function TextInput({
  keyName,
  value,
  onChange,
  onFocus,
  plain,
}: {
  onFocus?: () => void;
  /** Forces the plain box, for text the site prints without reading it. */
  plain?: boolean;
  keyName: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const prose =
    !plain &&
    (LONG_TEXT.test(keyName) || value.length > 90 || value.includes("\n"));
  // The site renders these through Markdown, so the panel should offer the
  // formatting rather than leaving the couple to type asterisks — and should
  // show what those asterisks will become.
  if (
    !plain &&
    (prose || SHORT_MARKDOWN.test(keyName) || /\*\*|\[.+\]\(/.test(value))
  ) {
    return (
      <MarkdownField value={value} onChange={onChange} onFocus={onFocus} />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      className="mt-1 min-h-9 w-full border border-olive-line bg-cream px-3 font-body text-sm text-ink focus:border-olive"
    />
  );
}

export function PayloadEditor({
  value,
  onChange,
  path = "",
  shape,
  optional,
  blanks,
}: EditorProps) {
  // Any accordion in here can ask the preview to show what it opened.
  const focusPreview = use(FocusContext);

  if (value === null) {
    return <p className="font-body text-xs text-dark-gray italic">vazio</p>;
  }

  if (typeof value === "string") {
    const key = path.split(".").pop() ?? "";
    // Some strings are not text. A date typed by hand breaks the countdown
    // with one wrong digit, and a photo pasted as a URL means cropping it
    // somewhere else first.
    if (DATETIME.test(key)) {
      return <DateTimeField value={value} onChange={onChange} />;
    }
    if (DATE_ONLY.test(key)) {
      return (
        <DateField value={value} onChange={onChange} className="mt-0 w-56" />
      );
    }
    if (IMAGE.test(key)) {
      return <ImageField fieldKey={key} value={value} onChange={onChange} />;
    }
    // The programme's icon is a word the site looks up in a table. Typed by
    // hand it is a word in English from a list nobody can see, and a typo
    // draws nothing at all.
    if (key === "icon") {
      return <IconField value={value} onChange={onChange} />;
    }
    // A chapter is several screens tall and shows one scene at a time, so the
    // accordion's anchor cannot also be the bio's — clicking into the bio has
    // to move the preview again, further down, or she is editing text that is
    // not on screen.
    const fieldAnchor = FIELD_ANCHOR[anchorPath(path)];
    return (
      <TextInput
        keyName={key}
        value={value}
        onChange={(v) => onChange(v)}
        onFocus={fieldAnchor ? () => focusPreview?.(fieldAnchor) : undefined}
      />
    );
  }

  if (typeof value === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 min-h-9 w-40 border border-olive-line bg-cream px-3 font-body text-sm text-ink focus:border-olive"
      />
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="mt-1">
        <Checkbox
          checked={value}
          onChange={onChange}
          label={value ? "sim" : "não"}
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ArrayEditor
        items={value}
        onChange={onChange}
        path={path}
      />
    );
  }

  // At the top of a section, the couple's own order wins over the struct's.
  const entries = Object.entries(value);
  const groups = SECTION_GROUPS[path];
  if (groups) {
    const claimed = new Set(groups.flatMap((g) => g.keys));
    return (
      <div className="grid gap-3">
        {groups.map((group) => {
          const inside = group.keys.filter((k) => k in value);
          if (inside.length === 0) return null;
          // A group of one object just IS that object — wrapping it would put
          // an accordion inside an accordion for no gain.
          const onlyKey = inside.length === 1 ? inside[0] : null;
          const lone = onlyKey ? value[onlyKey] : null;
          const loneObject = Boolean(lone && typeof lone === "object");
          return (
            <Accordion
              // Keyed by the section too. Two sections both have a group
              // called "Textos", and on a bare title React reused the same
              // accordion across the switch — carrying its open state over,
              // so a section that should arrive open arrived however the
              // previous one had been left.
              key={`${path}.${group.title}`}
              defaultOpen={group.open}
              title={group.title}
              subtitle={loneObject ? summarize(lone as Json) : undefined}
              onOpen={() => {
                // `path` is the section slug here, and the anchor map is
                // keyed by the whole path — a bare `title` belongs to half the
                // sections and would answer for all of them.
                // Falling back to the section itself, which is always an
                // anchor on the page: every group then puts something on
                // screen, instead of the ones without a mapped field leaving
                // the preview wherever it last happened to be.
                const anchor =
                  inside
                    .map((k) => FIELD_ANCHOR[`${anchorPath(path)}.${k}`])
                    .find(Boolean) ??
                  SECTION_ANCHOR[anchorPath(path)] ??
                  anchorPath(path)
                focusPreview?.(anchor)
              }}
            >
              {/* A group holding one object IS that object: unwrap it, or the
                  panel shows "A noiva" wrapping an accordion also called
                  "Noiva", with nothing between them. */}
              {onlyKey && loneObject ? (
                <PayloadEditor
                  value={lone as Json}
                  path={`${path}.${onlyKey}`}
                  onChange={(next) => onChange({ ...value, [onlyKey]: next })}
                />
              ) : (
                <PayloadEditor
                  value={Object.fromEntries(inside.map((k) => [k, value[k]]))}
                  path={`${path}::${group.title}`}
                  onChange={(next) =>
                    onChange({ ...value, ...(next as Record<string, Json>) })
                  }
                />
              )}
            </Accordion>
          );
        })}
        {/* The gifts are records of their own, not payload — but they are one
            block of this section on the page, so they are edited beside its
            text and saved by the same bar. */}
        {path === "gifts_intro" ? (
          <Accordion title="Lista de presentes">
            <GiftListSlot />
          </Accordion>
        ) : null}

        {/* Anything the map does not mention still appears, so a new API field
            is never silently uneditable. */}
        {entries.filter(([k]) => !claimed.has(k)).length > 0 ? (
          <PayloadEditor
            value={Object.fromEntries(entries.filter(([k]) => !claimed.has(k)))}
            path={`${path}::resto`}
            onChange={(next) =>
              onChange({ ...value, ...(next as Record<string, Json>) })
            }
          />
        ) : null}
      </div>
    );
  }

  // Walk the shape, not just what is here: a key the entry lacks has to keep
  // its place in the column, or "adicionar subtítulo" ends up at the bottom,
  // nowhere near the line it would create.
  const ordered =
    shape && shape.length > 0 ? shape : entries.map(([key]) => key);

  return (
    <div className="grid gap-3">
      {ordered.map((key) => {
        // A field that waits on another one stays out of the way until that
        // one says yes.
        const gate = FIELD_ONLY_IF[`${anchorPath(path)}.${key}`];
        if (gate && !value[gate]) return null;

        const blank = blanks?.[key] ?? "";
        if (!(key in value)) {
          // A checkbox has nothing to add: not ticked IS an answer, and asking
          // the couple to add it first only made them click twice.
          if (typeof blank !== "boolean") {
            return (
              <AbsentField
                key={key}
                label={humanize(key)}
                onAdd={() => onChange({ ...value, [key]: blank })}
              />
            );
          }
        }
        const child = key in value ? value[key] : blank;
        const childPath = path ? `${path}.${key}` : key;
        // Removable when a sibling gets by without it, or when it is sitting
        // there empty — which is what an accidental "adicionar" leaves behind,
        // and what the couple had no way to undo.
        // Never a checkbox: unticked already says no, so a bin beside it would
        // offer to remove an answer the couple has already given. And never a
        // key that is not there — the bin would do nothing.
        const removable =
          key in value &&
          typeof child !== "boolean" &&
          (Boolean(optional?.has(key)) || child === "");
        const editor = (
          <PayloadEditor
            value={child}
            path={childPath}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        );

        // Anything with an inside of its own folds away: the bride's chapter is
        // a name, a bio, a portrait and a letter, and flattened it buries the
        // shape of the section under one long column.
        // A list is already a column of accordions, one per item — wrapping
        // it in one more only repeats the name.
        if (child && typeof child === "object" && !Array.isArray(child)) {
          return (
            <Accordion
              key={key}
              title={humanize(key)}
              subtitle={summarize(child)}
            >
              {editor}
              {/* The wink's position is two percentages, which nobody can
                  guess — so the photo itself becomes the input. */}
              {"eye_x" in child && "eye_y" in child ? (
                <EyePicker
                  onPicked={(x, y) =>
                    onChange({
                      ...value,
                      [key]: { ...child, eye_x: x, eye_y: y },
                    })
                  }
                />
              ) : null}
            </Accordion>
          );
        }

        // A plain field labels itself. Deliberately NOT a <label> wrapping the
        // whole thing: some of these render as a group of buttons, and a label
        // around them makes clicking the caption open the first one.
        // A list is already a column of accordions, one per item. Wrapping it
        // in one more just names the same thing twice.
        return (
          <div key={key}>
            {Array.isArray(child) ? null : (
              <span className="flex items-center gap-1.5">
                <span className="font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
                  {humanize(key)}
                </span>
                {removable ? (
                  <button
                    type="button"
                    aria-label={`Tirar ${humanize(key)}`}
                    title={`Tirar ${humanize(key)}`}
                    onClick={() => {
                      const { [key]: _removed, ...rest } = value;
                      onChange(rest);
                    }}
                    className="cursor-pointer p-0.5 text-dark-gray/50 transition-colors hover:text-terracotta"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            )}
            {editor}
          </div>
        );
      })}

      {/* The gallery belongs to the person, not to the section payload — it is
          a file in the bucket. The couple should not have to know that, so it
          appears here, under her handle, where it appears on the site. */}
      {anchorPath(path) === "our_story.bride" ? (
        <ChapterPhotosSlot person="bride" />
      ) : null}
      {anchorPath(path) === "our_story.groom" ? (
        <ChapterPhotosSlot person="groom" />
      ) : null}
    </div>
  );
}

/**
 * A field the entry does not have yet, holding its own place in the column.
 *
 * The couple reads down a form; a row of "adicionar" buttons under everything
 * else says nothing about where the thing would land. This sits exactly where
 * the line will appear.
 */
function AbsentField({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div>
      <span className="block font-body text-xs tracking-[0.1em] text-dark-gray/60 uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1 flex min-h-9 w-full cursor-pointer items-center gap-1.5 border border-dashed border-olive-line px-3 font-body text-sm text-dark-gray/70 transition-colors hover:border-olive hover:text-olive"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        adicionar
      </button>
    </div>
  );
}

/** A one-line hint of what is folded away, so a closed row still says something. */
function summarize(value: Json): string {
  if (Array.isArray(value)) {
    return value.length === 1 ? "1 item" : `${value.length} itens`;
  }
  if (value && typeof value === "object") {
    for (const key of ["name", "title", "label"]) {
      const v = value[key];
      if (typeof v === "string" && v) return v;
    }
    const filled = Object.values(value).filter(
      (v) => v !== "" && v !== null && v !== undefined,
    ).length;
    return filled === 1 ? "1 campo" : `${filled} campos`;
  }
  return "";
}

/**
 * A list the couple can grow and shrink — the programme, the hotels, the
 * gift cards. New entries are cloned from the first one so the shape stays
 * whatever the API expects, instead of an empty object the server rejects.
 */
function ArrayEditor({
  items,
  onChange,
  path,
}: {
  items: Json[];
  onChange: (next: Json) => void;
  path: string;
}) {
  const focusPreview = use(FocusContext);

  /**
   * A lasting identity per row, so React can tell the rows apart.
   *
   * Keyed by index, removing the third moment did not remove a row — it handed
   * the third row's React state to the fourth moment, which moved up into it.
   * The accordion stayed open on something else, a half-typed label belonged to
   * the entry that had just been deleted, and the preview, whose anchors are
   * index-based too, was pointing at a different moment than the panel showed.
   */
  const seq = useRef(0);
  const [keys, setKeys] = useState<number[]>(() => items.map(() => seq.current++));
  // The list can also change from outside — switching tabs, discarding a draft.
  // Then there is no handler to have kept these in step, so they start over.
  if (keys.length !== items.length) {
    setKeys(items.map(() => seq.current++));
  }

  const remove = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
    onChange(items.filter((_, i) => i !== index));
    // Send the preview to the nearest frame that will still be there. Left
    // alone it kept pointing at a position the list no longer has — the album
    // scrolled to nothing, which is what looked like the preview breaking on a
    // delete. The neighbour exists both before and after, so this is safe
    // whether or not the new draft has reached the iframe yet.
    const survivor = Math.max(0, Math.min(index, items.length - 2));
    const anchor = anchorAt(survivor);
    if (anchor) focusPreview?.(anchor);
  };

  const isEntry = (v: Json): v is Record<string, Json> =>
    Boolean(v) && typeof v === "object" && !Array.isArray(v);

  // The shape of an entry, in payload order, read off the siblings. A key some
  // sibling gets by without is an optional one, and may be taken back out.
  const shape: string[] = [];
  for (const item of items) {
    if (!isEntry(item)) continue;
    for (const key of Object.keys(item)) {
      if (!shape.includes(key)) shape.push(key);
    }
  }
  const optional = new Set(
    shape.filter((key) => items.some((item) => isEntry(item) && !(key in item))),
  );
  // What an empty one of each looks like. Adding a missing key as `""` turned
  // a checkbox into a blank string, which is neither true nor false and is not
  // what the API is holding a boolean for.
  const blanks: Record<string, Json> = {};
  for (const key of shape) {
    for (const item of items) {
      if (!isEntry(item) || !(key in item)) continue;
      const sample = item[key];
      blanks[key] =
        typeof sample === "boolean"
          ? false
          : typeof sample === "number"
            ? 0
            : Array.isArray(sample)
              ? []
              : sample && typeof sample === "object"
                ? {}
                : "";
      break;
    }
  }

  // Only the album has a frame per entry. Every other list is one block on the
  // page, so its entries all point at the block — without this, opening the
  // first item of the programme scrolled the site to the first album photo.
  const listPath = anchorPath(path);
  const perItem = LIST_ITEM_ANCHOR[listPath];
  const anchorAt = (index: number) =>
    perItem ? `${perItem}-${index}` : FIELD_ANCHOR[listPath];

  const blankLike = (sample: Json | undefined): Json => {
    if (sample === undefined) return "";
    if (Array.isArray(sample)) return [];
    if (sample && typeof sample === "object") {
      return Object.fromEntries(
        Object.entries(sample).map(([k, v]) => [
          k,
          typeof v === "string"
            ? ""
            : typeof v === "number"
              ? 0
              : typeof v === "boolean"
                ? false
                : v,
        ]),
      );
    }
    return typeof sample === "number"
      ? 0
      : typeof sample === "boolean"
        ? false
        : "";
  };

  const title = (item: Json, index: number): string => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const key of ["title", "label", "name", "time", "date"]) {
        const v = item[key];
        if (typeof v === "string" && v) return v;
      }
    }
    return `Item ${index + 1}`;
  };

  return (
    <div className="mt-1 grid gap-2">
      {items.map((item, index) => (
        <Accordion
          key={keys[index] ?? index}
          title={title(item, index)}
          // Each frame is addressable, so opening the sixth moment shows the
          // sixth moment rather than the top of the album.
          onOpen={() => {
            const anchor = anchorAt(index);
            if (anchor) focusPreview?.(anchor);
          }}
          right={
            <button
              type="button"
              aria-label={`Remover ${title(item, index)}`}
              title="Remover"
              onClick={() => remove(index)}
              className="cursor-pointer p-1 text-dark-gray/60 transition-colors hover:text-terracotta"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          }
          defaultOpen={items.length === 1}
        >
          <PayloadEditor
            value={item}
            path={path}
            shape={shape}
            optional={optional}
            blanks={blanks}
            onChange={(next) =>
              onChange(items.map((old, i) => (i === index ? next : old)))
            }
          />

          {/* Also down here, where the work is. The one in the header is a
              16-pixel icon at the end of a row that a long name fills, and it
              scrolls out of sight the moment the entry is open — so removing
              something meant folding it up again to go and find it. */}
          <div className="mt-3 flex justify-end border-t border-sand-line pt-3">
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex cursor-pointer items-center gap-1.5 font-body text-sm text-dark-gray transition-colors hover:text-terracotta"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remover
            </button>
          </div>
        </Accordion>
      ))}

      <button
        type="button"
        onClick={() => {
          setKeys([...keys, seq.current++]);
          onChange([...items, blankLike(items[0])]);
        }}
        className="flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-dashed border-olive-line font-body text-sm text-dark-gray transition-colors hover:border-olive hover:text-olive"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Adicionar
      </button>
    </div>
  );
}

/**
 * The save button, repeated at the foot of every folded group.
 *
 * It saves the whole section, because that is what the API stores — but a
 * section can be a long column, and making the couple scroll back to the top
 * after editing one hotel is the kind of small friction that adds up.
 */
/** Asks the live preview for a point on the announcement photo. */
function EyePicker({ onPicked }: { onPicked: (x: number, y: number) => void }) {
  const pick = use(PickContext);
  if (!pick) return null;
  const active = pick.picking === "announcement-eye";
  return (
    <div className="mt-3">
      <Button
        tone={active ? "danger" : "quiet"}
        onClick={() =>
          active ? pick.cancel() : pick.start("announcement-eye", onPicked)
        }
      >
        {active ? "Cancelar" : "Marcar o olho no preview"}
      </Button>
      <p className="mt-1 font-body text-xs text-dark-gray italic">
        Em vez de adivinhar os números, clique no olho fechado da Catarina ao
        lado.
      </p>
    </div>
  );
}
