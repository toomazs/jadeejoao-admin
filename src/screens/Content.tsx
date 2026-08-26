import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { $api, problemDetail } from "../api/client";
import {
  FocusContext,
  PayloadEditor,
  PickContext,
} from "../components/PayloadEditor";
import { ScreenTitle } from "../components/Shell";
import { ChapterPhotos, GalleryContext } from "../components/ChapterPhotos";
import type { ChapterPhoto } from "../components/ChapterPhotos";
import { GiftList, GiftsContext, giftBody, isNew } from "../components/GiftList";
import type { Gift } from "../components/GiftList";
import { SitePreview } from "../components/SitePreview";
import type { Draft } from "../components/SitePreview";
import { Notice, SaveBar, shakeSaveBar, Tabs, Toggle } from "../components/ui";
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
  const focusOn = (id: string) =>
    setAnchor((current) => ({ id, n: (current?.n ?? 0) + 1 }));
  const queryClient = useQueryClient();

  const sections = $api.useQuery("get", "/api/v1/admin/sections");
  const save = $api.useMutation("put", "/api/v1/admin/sections/{slug}");

  // The two galleries under the chapters. They are files in the bucket rather
  // than part of any section, but they are edited inside "A noiva" and "O
  // noivo", so this screen carries them and the one save bar covers them too.
  const bride = $api.useQuery("get", "/api/v1/admin/instagram/{person}", {
    params: { path: { person: "bride" } },
  });
  const groom = $api.useQuery("get", "/api/v1/admin/instagram/{person}", {
    params: { path: { person: "groom" } },
  });
  const saveGallery = $api.useMutation(
    "put",
    "/api/v1/admin/instagram/{person}",
  );

  // The gift list, likewise: records of its own, edited inside the Presentes
  // section because that is the one block of the page it is.
  const giftsQuery = $api.useQuery("get", "/api/v1/admin/gifts");
  const createGift = $api.useMutation("post", "/api/v1/admin/gifts");
  const updateGift = $api.useMutation("put", "/api/v1/admin/gifts/{gift_id}");
  const deleteGift = $api.useMutation(
    "delete",
    "/api/v1/admin/gifts/{gift_id}",
  );
  const storedGifts = useMemo(
    () => (giftsQuery.data?.gifts ?? []) as Gift[],
    [giftsQuery.data],
  );
  const [gifts, setGifts] = useState<Gift[] | null>(null);
  useEffect(() => {
    setGifts(structuredClone(storedGifts));
  }, [storedGifts]);

  const storedGalleries = useMemo(
    () => ({
      bride: (bride.data?.posts ?? []) as ChapterPhoto[],
      groom: (groom.data?.posts ?? []) as ChapterPhoto[],
    }),
    [bride.data, groom.data],
  );
  const [galleries, setGalleries] = useState<{
    bride: ChapterPhoto[];
    groom: ChapterPhoto[];
  } | null>(null);

  useEffect(() => {
    setGalleries(structuredClone(storedGalleries));
  }, [storedGalleries]);

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
  /**
   * The gift list as the site would receive it.
   *
   * The card counts down `units_left`, which the API works out — quotas minus
   * the ones already taken. The panel edits `max_units`, so raising the number
   * of quotas changed nothing on screen: the preview was still showing a
   * remainder computed from the old total. Here the same subtraction is done
   * against the draft, with the taken count read from what was stored.
   */
  const previewGifts = useMemo(
    () =>
      (gifts ?? storedGifts)
        .filter((g) => g.active !== false)
        .map((gift) => {
          if (gift.max_units == null) return gift;
          const before = storedGifts.find((g) => g.gift_id === gift.gift_id);
          const taken = Math.max(
            0,
            (before?.max_units ?? 0) - (before?.units_left ?? before?.max_units ?? 0),
          );
          return { ...gift, units_left: Math.max(0, gift.max_units - taken) };
        }),
    [gifts, storedGifts],
  );

  const previewDraft: Draft = useMemo(() => {
    const merged = all.map((s) => (s.slug === slug && draft ? draft : s));
    return {
      content: { sections: merged.filter((s) => s.enabled !== false) },
      // The unsaved gift list too — it is what the Presentes section draws.
      gifts: { gifts: previewGifts },
    };
  }, [all, slug, draft, previewGifts]);

  const dirtyGalleries = galleries
    ? (["bride", "groom"] as const).filter(
        (who) =>
          JSON.stringify(galleries[who]) !==
          JSON.stringify(storedGalleries[who]),
      )
    : [];
  const dirtyGifts = gifts
    ? JSON.stringify(gifts) !== JSON.stringify(storedGifts)
    : false;
  const dirty =
    (draft && stored
      ? JSON.stringify(draft) !== JSON.stringify(stored)
      : false) ||
    dirtyGalleries.length > 0 ||
    dirtyGifts;

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

    // The galleries first: a photo picked in the panel is a data URL until it
    // is uploaded, and the manifest must hold URLs.
    if (galleries && dirtyGalleries.length > 0) {
      setUploading(true);
      try {
        for (const who of dirtyGalleries) {
          let posts = galleries[who];
          if (hasPendingImages(posts)) {
            posts = await uploadPendingImages(posts, `instagram-${who}`);
            setGalleries((current) =>
              current ? { ...current, [who]: posts } : current,
            );
          }
          await saveGallery.mutateAsync({
            params: { path: { person: who } },
            body: { posts: posts as never },
          });
        }
      } catch (err) {
        setUploading(false);
        setError(problemDetail(err, "Não conseguimos salvar as fotos."));
        return;
      }
      setUploading(false);
    }

    // The gift list: create what is new, update what changed, delete what the
    // couple took out. Diffed by id rather than sent whole, because these are
    // records with contributions counted against them — there is no endpoint
    // that would take the list in one piece, and there should not be.
    if (gifts && dirtyGifts) {
      try {
        const kept = new Set(gifts.map((g) => g.gift_id));
        for (const old of storedGifts) {
          if (old.gift_id && !kept.has(old.gift_id)) {
            await deleteGift.mutateAsync({
              params: { path: { gift_id: old.gift_id } },
            });
          }
        }
        for (const [at, gift] of gifts.entries()) {
          const body = giftBody(gift, at);
          if (isNew(gift)) {
            await createGift.mutateAsync({ body: body as never });
            continue;
          }
          const before = storedGifts.find((g) => g.gift_id === gift.gift_id);
          // Position counts as a change: moving a card is the only way its
          // order is set now, and nothing else about it need have moved.
          const moved = storedGifts.indexOf(before as Gift) !== at;
          if (!moved && JSON.stringify(before) === JSON.stringify(gift)) continue;
          await updateGift.mutateAsync({
            params: { path: { gift_id: gift.gift_id as string } },
            body: body as never,
          });
        }
      } catch (err) {
        setError(problemDetail(err, "Não conseguimos salvar os presentes."));
        return;
      }
    }

    // A section may be untouched while a gallery is not — the bar covers both,
    // so saving one must not write the other back over itself.
    if (JSON.stringify(draft) === JSON.stringify(stored)) {
      setSaved("Salvo. O site já está com essa versão.");
      void queryClient.invalidateQueries();
      return;
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
    // A column the height of the pane: the title and the tabs hold their
    // place, and what is left goes to the two panes. Nothing here scrolls the
    // page — the editor scrolls itself and the preview scrolls the site.
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ScreenTitle
          title="Conteúdo"
          subtitle="Os textos e as fotos do site. O que você digitar aparece ao lado antes de salvar."
          actions={
            <>
              <Notice kind="error">{error}</Notice>
              <Notice kind="ok">{saved}</Notice>
            </>
          }
        />
      </div>

      <Tabs
        className="mb-3 shrink-0"
        tabs={all.map((s) => ({
          value: s.slug,
          label: SECTION_PT[s.slug] ?? s.slug,
          note: s.enabled === false ? "oculta" : undefined,
        }))}
        value={slug}
        onChange={(next) => {
          if (next === slug) return false;
          // Switching section throws the draft away — the effect above
          // rebuilds it from the server copy — so while there is unsaved work
          // the tabs do not switch at all. The bar shakes to point at itself,
          // and it holds the two ways out: salvar or descartar. Nothing here
          // is allowed to lose a sentence she just wrote to a stray click.
          if (dirty && shakeSaveBar()) return false;
          // Drop the anchor with the section. It outlives the tab otherwise,
          // and the preview prefers it over the section — so leaving "Nossa
          // história" with an album frame open and clicking "Dress code"
          // scrolled the site back up to that frame, every time, looking for
          // all the world like the scroll was stuck.
          setAnchor(null);
          setSlug(next);
        }}
      />

      <GiftsContext
        value={() =>
          gifts ? <GiftList gifts={gifts} onChange={setGifts} /> : null
        }
      >
      <GalleryContext
        value={(person) =>
          galleries ? (
            <ChapterPhotos
              posts={galleries[person]}
              onChange={(next) =>
                setGalleries((current) =>
                  current ? { ...current, [person]: next } : current,
                )
              }
            />
          ) : null
        }
      >
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
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,26rem)_1fr]">
              <div className="min-w-0 overflow-y-auto border border-olive-line bg-cream px-4 py-4">
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
                className="min-h-[24rem] xl:min-h-0"
              />
            </div>
          </PickContext>
        </FocusContext>
      </GalleryContext>
      </GiftsContext>

      <SaveBar
        visible={dirty}
        saving={save.isPending || uploading}
        label={uploading ? "Enviando a foto…" : undefined}
        onSave={() => void submit()}
        onReset={() => {
          if (stored) setDraft(structuredClone(stored));
          setGalleries(structuredClone(storedGalleries));
          setGifts(structuredClone(storedGifts));
        }}
      />
    </div>
  );
}
