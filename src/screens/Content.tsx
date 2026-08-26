import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { $api, problemDetail } from "../api/client";
import {
  FocusContext,
  PayloadEditor,
  PickContext,
} from "../components/PayloadEditor";
import { ScreenTitle } from "../components/Shell";
import { SitePreview } from "../components/SitePreview";
import type { Draft } from "../components/SitePreview";
import { Button, Notice, Toggle } from "../components/ui";
import { SECTION_PT } from "../lib/labels-fields";
import { hasPendingImages, uploadPendingImages } from "../lib/uploads";

type Section = Record<string, unknown> & { slug: string; enabled?: boolean };

/**
 * Editing the words of the site, with the site alongside.
 *
 * Everything the couple can change lives in one `sections` table as a typed
 * JSONB payload per slug (AD-8), and the slug set is closed: this screen
 * updates, it never creates or deletes.
 *
 * The preview is the reason this screen is worth using. Text that is fine in a
 * form can still break a layout, and finding that out after publishing is the
 * thing the panel exists to prevent.
 */
export function Content() {
  const [slug, setSlug] = useState("hero");
  const [draft, setDraft] = useState<Section | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [uploading, setUploading] = useState(false);
  // Which photo the preview is waiting to be clicked on, and who wants the
  // answer. Kept here because the preview lives here too.
  const [picking, setPicking] = useState<string | null>(null);
  const pickHandler = useRef<((x: number, y: number) => void) | null>(null);
  // Which part of the page the preview should be showing. Set when an
  // accordion opens, so what is being edited is what is on screen. The counter
  // rides along because re-opening the same one must scroll again, and a state
  // set to the value it already held changes nothing.
  const [anchor, setAnchor] = useState<{ id: string; n: number } | null>(null);
  const focusOn = (id: string) => setAnchor((current) => ({ id, n: (current?.n ?? 0) + 1 }));
  const queryClient = useQueryClient();

  const sections = $api.useQuery("get", "/api/v1/admin/sections");
  const save = $api.useMutation("put", "/api/v1/admin/sections/{slug}");

  const all = useMemo(
    () => (sections.data?.sections ?? []) as unknown as Section[],
    [sections.data],
  );
  const stored = all.find((s) => s.slug === slug);

  // Reset the draft whenever the couple switches section, or when a fresh copy
  // arrives from the server after saving.
  useEffect(() => {
    if (stored) setDraft(structuredClone(stored));
    setError("");
    setSaved("");
  }, [stored]);

  /**
   * What the preview renders: the whole site, with this section replaced by the
   * unsaved draft and the disabled ones dropped — which is exactly what the
   * public endpoint does server-side, so the preview matches production.
   */
  const previewDraft: Draft = useMemo(() => {
    const merged = all.map((s) => (s.slug === slug && draft ? draft : s));
    return { content: { sections: merged.filter((s) => s.enabled !== false) } };
  }, [all, slug, draft]);

  const dirty =
    draft && stored ? JSON.stringify(draft) !== JSON.stringify(stored) : false;

  const submit = async () => {
    if (!draft || !dirty || uploading) return;
    setError("");
    setSaved("");

    // Photos picked in the panel ride in the draft as data URLs so the preview
    // can show them unsaved. They become real files here, on the way out —
    // saving base64 into the payload would put a megabyte of JSON in Postgres
    // and serve it to every guest.
    let payload = draft;
    if (hasPendingImages(draft)) {
      setUploading(true);
      try {
        payload = await uploadPendingImages(draft, slug);
        setDraft(payload);
      } catch (err) {
        setUploading(false);
        setError(
          err instanceof Error ? err.message : "Não conseguimos enviar a foto.",
        );
        return;
      }
      setUploading(false);
    }

    save.mutate(
      // The path decides the slug; the API ignores the one in the body.
      { params: { path: { slug: slug as never } }, body: payload as never },
      {
        onSuccess: () => {
          setSaved("Salvo. O site já está com essa versão.");
          void queryClient.invalidateQueries();
        },
        onError: (err) =>
          setError(problemDetail(err, "Não conseguimos salvar essa seção.")),
      },
    );
  };

  // The payload sits under a key named after the slug; `enabled` rides beside
  // it. Editing them separately keeps the switch out of the generic editor,
  // where it would read as just another field.
  const payload = (draft?.[slug] ?? null) as never;

  return (
    <>
      <ScreenTitle
        title="Conteúdo"
        subtitle="Os textos e as fotos do site. O que você digitar aparece ao lado antes de salvar."
        actions={
          <>
            <Notice kind="error">{error}</Notice>
            <Notice kind="ok">{saved}</Notice>
            <Button
              onClick={() => void submit()}
              disabled={!dirty || save.isPending || uploading}
            >
              {uploading
                ? "Enviando a foto…"
                : save.isPending
                  ? "Salvando…"
                  : dirty
                    ? "Salvar"
                    : "Sem alterações"}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {all.map((s) => (
          <Button
            key={s.slug}
            tone={slug === s.slug ? "primary" : "quiet"}
            onClick={() => {
              // Drop the anchor with the section. It outlives the tab
              // otherwise, and the preview prefers it over the section — so
              // leaving "Nossa história" with an album frame open and clicking
              // "Dress code" scrolled the site back up to that frame, every
              // time, looking for all the world like the scroll was stuck.
              setAnchor(null);
              setSlug(s.slug);
            }}
          >
            {SECTION_PT[s.slug] ?? s.slug}
            {s.enabled === false ? " · oculta" : ""}
          </Button>
        ))}
      </div>

      <FocusContext value={focusOn}>
        <PickContext
          value={{
            picking,
            start: (target, onPicked) => {
              pickHandler.current = onPicked;
              setPicking(target);
            },
            cancel: () => setPicking(null),
          }}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_1fr]">
            <div className="min-w-0 border border-olive-line bg-cream px-4 py-4">
              {draft ? (
                <>
                  <div className="border-b border-sand-line pb-3">
                    <Toggle
                      checked={draft.enabled !== false}
                      onChange={(on) => setDraft({ ...draft, enabled: on })}
                      label="Mostrar esta seção no site"
                      hint="Desligada, ela some do site inteiro."
                    />
                  </div>
                  {/* The editor folds the section into its own groups, so there
                  is no outer accordion here — that would only add a lid. */}
                  <div className="mt-4">
                    <PayloadEditor
                      value={payload}
                      path={slug}
                      onChange={(next) =>
                        setDraft({ ...draft, [slug]: next as never })
                      }
                      onSave={() => void submit()}
                      saving={save.isPending || uploading}
                    />
                  </div>
                </>
              ) : (
                <p className="font-body text-sm text-dark-gray italic">·</p>
              )}
            </div>

            <SitePreview
              draft={previewDraft}
              focusSlug={slug}
              focusAnchor={anchor?.id}
          focusNonce={anchor?.n}
              picking={picking ?? undefined}
              onPicked={(x, y) => {
                pickHandler.current?.(x, y);
                setPicking(null);
              }}
              className="min-h-[36rem] xl:sticky xl:top-4 xl:h-[calc(100svh-2rem)]"
            />
          </div>
        </PickContext>
      </FocusContext>
    </>
  );
}
