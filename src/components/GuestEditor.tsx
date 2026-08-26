import { useState } from "react";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { $api, problemDetail } from "../api/client";
import { Button, Field, Modal, Notice, Select } from "./ui";
import {
  CATEGORIES,
  CATEGORY_ONE,
  CEREMONY_ROLES,
  GENDERS,
  GENDER_PT,
  SIDES,
  SIDE_PT,
} from "../lib/labels";

/**
 * The "let me type one" option.
 *
 * A word nobody would give somebody as a role, so it cannot collide with a
 * real one. It was a NUL character first, which is clever and puts a null byte
 * in a source file — grep then calls it binary and refuses to read it.
 */
const OUTRO = "__outro__";

interface Row {
  groupId: string;
  groupLabel: string;
  guestId: string;
  fullName: string;
  category?: string;
  gender?: string;
  side?: string;
  circle: string;
  ceremonyRole: string;
  notes: string;
  /** How many share this invitation. Decides whether it has a name worth having. */
  groupSize: number;
}

interface GuestEditorProps {
  row: Row;
  /** Every guest, so the invitation can be merged into another one. */
  allRows: {
    guestId: string;
    groupId: string;
    groupLabel: string;
    fullName: string;
    isPrimary: boolean;
  }[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * One guest, up close: their details, the invitation they belong to, and the
 * two repairs that need another invitation to point at.
 *
 * Attendance is not here. The RSVP flow owns it, and an edit screen that could
 * quietly rewrite somebody's answer would make the dashboard untrustworthy —
 * the couple would never know whether a "vai" came from the guest or a slip.
 */
export function GuestEditor({
  row,
  allRows,
  onClose,
  onSaved,
}: GuestEditorProps) {
  const [name, setName] = useState(row.fullName);
  const [category, setCategory] = useState(row.category ?? "");
  const [gender, setGender] = useState(row.gender ?? "");
  const [side, setSide] = useState(row.side ?? "");
  const [circle, setCircle] = useState(row.circle);
  const [ceremonyRole, setCeremonyRole] = useState(
    row.ceremonyRole || (row.guestId ? "" : "Convidado"),
  );
  // Somebody already carrying a role the list does not have is editing a
  // custom one, whether or not they ever pressed "Outro".
  const [customRole, setCustomRole] = useState(
    Boolean(row.ceremonyRole) &&
      !(CEREMONY_ROLES as readonly string[]).includes(row.ceremonyRole),
  );
  const [notes, setNotes] = useState(row.notes);
  const [label, setLabel] = useState(row.groupLabel);
  const [moveTo, setMoveTo] = useState("");
  const [companion, setCompanion] = useState("");
  const [error, setError] = useState("");

  // A row with no id is somebody who does not exist yet.
  const creating = !row.guestId;
  const save = $api.useMutation("patch", "/api/v1/admin/guests/{guest_id}");
  const create = $api.useMutation("post", "/api/v1/admin/guests");
  const addCompanion = $api.useMutation("post", "/api/v1/admin/guests");
  const rename = $api.useMutation("patch", "/api/v1/admin/groups/{group_id}");
  const merge = $api.useMutation(
    "post",
    "/api/v1/admin/groups/{group_id}/members",
  );
  const detach = $api.useMutation(
    "delete",
    "/api/v1/admin/guests/{guest_id}/invitation",
  );

  const fail = (err: unknown) => setError(problemDetail(err));

  /** Everybody on this invitation, the person being edited included. */
  const onThisInvitation = allRows.filter((r) => r.groupId === row.groupId);
  const sharing = onThisInvitation.length > 1;
  const owner =
    sharing &&
    onThisInvitation.some((r) => r.guestId === row.guestId && r.isPrimary);

  const detachGuest = (guestId: string) => {
    setError("");
    detach.mutate(
      { params: { path: { guest_id: guestId } } },
      { onSuccess: onSaved, onError: fail },
    );
  };

  /**
   * People on the list who match what is being typed and are not already here.
   *
   * Accent-blind and limited, because this is a hint under a field and not a
   * directory: past a handful it stops helping and starts being a list to read.
   */
  const jaExistem = (() => {
    const q = companion.trim();
    if (q.length < 2) return [];
    const fold = (t: string) =>
      t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return allRows
      .filter(
        (r) => r.groupId !== row.groupId && fold(r.fullName).includes(fold(q)),
      )
      .slice(0, 6);
  })();

  /** The other invitations, one entry each, named after their label. */
  const invitations = [
    ...new Map(allRows.map((r) => [r.groupId, r.groupLabel])).entries(),
  ]
    .filter(([id]) => id !== row.groupId)
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

  const submit = () => {
    setError("");
    const details = {
      full_name: name.trim(),
      category: category || undefined,
      gender: gender || undefined,
      side: side || undefined,
      circle,
      ceremony_role: ceremonyRole,
      notes,
    };

    if (creating) {
      // Nothing to rename: a new person's invitation is labelled with their
      // name. But they can be born straight into somebody else's, which is
      // what "acompanhante" means most of the time.
      create.mutate(
        { body: { ...details, group_id: moveTo || undefined } as never },
        { onSuccess: onSaved, onError: fail },
      );
      return;
    }

    save.mutate(
      {
        params: { path: { guest_id: row.guestId } },
        body: details as never,
      },
      {
        onSuccess: () => {
          if (label.trim() && label.trim() !== row.groupLabel) {
            rename.mutate(
              {
                params: { path: { group_id: row.groupId } },
                body: { label: label.trim() },
              },
              { onSuccess: onSaved, onError: fail },
            );
            return;
          }
          onSaved();
        },
        onError: fail,
      },
    );
  };

  return (
    <Modal
      title={creating ? "Novo convidado" : row.fullName}
      subtitle={
        creating
          ? "Ele entra com convite próprio, podendo confirmar por si."
          : "A presença não se edita aqui — ela pertence à confirmação do convidado."
      }
      onClose={onClose}
      footer={
        <>
          <Button tone="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={save.isPending || rename.isPending || create.isPending}
          >
            {save.isPending || rename.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field
          label="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Pick
            label="Faixa"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            labels={CATEGORY_ONE}
          />
          <Pick
            label="Gênero"
            value={gender}
            onChange={setGender}
            options={GENDERS}
            labels={GENDER_PT}
          />
          <Pick
            label="De quem"
            value={side}
            onChange={setSide}
            options={SIDES}
            labels={SIDE_PT}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Círculo"
            value={circle}
            onChange={(e) => setCircle(e.target.value)}
            hint="Amigos, família, trabalho…"
          />
          <div>
            <Select
              label="Papel"
              value={customRole ? OUTRO : ceremonyRole}
              onChange={(next) => {
                if (next === OUTRO) {
                  setCustomRole(true);
                  setCeremonyRole("");
                  return;
                }
                setCustomRole(false);
                setCeremonyRole(next);
              }}
              options={[
                { value: "", label: "— sem papel —" },
                ...CEREMONY_ROLES.map((role) => ({ value: role, label: role })),
                { value: OUTRO, label: "Outro…" },
              ]}
            />
            {/* Typed by hand only when they ask for it. Free text every time is
                how "Madrinha" and "madrinha" become two roles, and the ceremony
                card grows a duplicate of itself. */}
            {customRole ? (
              <input
                autoFocus
                value={ceremonyRole}
                onChange={(e) => setCeremonyRole(e.target.value)}
                placeholder="Qual papel?"
                className="mt-1.5 min-h-10 w-full border border-olive-line bg-cream px-3 font-body text-base text-ink placeholder:text-dark-gray/45 focus:border-olive"
              />
            ) : null}
          </div>
        </div>

        <Field
          label="Observação"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Parentesco, lembretes — só vocês veem."
        />

        <hr className="my-1 border-sand-line" />

        {/* One section, not three.
            "Nome do convite", "Juntar a outro convite" and "Acrescentar
            alguém" were the same question asked three ways — who does this
            person share an invitation with — and which of the three made sense
            depended on an answer the couple had to work out themselves. What
            is shown now follows from where the person already is. */}
        <div className="grid gap-3">
          <span className="font-body text-sm text-dark-gray">Convite</span>

          {sharing ? (
            <>
              <ul className="grid gap-1 border border-olive-line bg-veil px-3 py-2">
                {onThisInvitation.map((person) => (
                  <li
                    key={person.guestId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 truncate font-body text-sm text-ink">
                      {person.fullName}
                      {person.isPrimary ? (
                        <span className="ml-1.5 font-body text-xs text-dark-gray">
                          · responde
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tirar ${person.fullName} deste convite`}
                      title="Dar um convite só para esta pessoa"
                      disabled={detach.isPending}
                      onClick={() => detachGuest(person.guestId)}
                      className="shrink-0 cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-terracotta disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              <Field
                label="Como este convite se chama"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                hint={`O título que ${onThisInvitation.length} pessoas veem ao encontrá-lo.`}
              />
            </>
          ) : null}

          {/* The owner of a shared invitation has nowhere to join: they are
              already the one somebody else joined. */}
          {!creating && !owner ? (
            <div>
              <Rotulado
                label={
                  sharing
                    ? "Mudar para outro convite"
                    : "Juntar a outro convite"
                }
              >
                <Select
                  searchable
                  value={moveTo}
                  onChange={setMoveTo}
                  placeholder="— manter onde está —"
                  options={[
                    { value: "", label: "— manter onde está —" },
                    ...invitations.map(([id, text]) => ({
                      value: id,
                      label: text,
                    })),
                  ]}
                />
              </Rotulado>
              {moveTo ? (
                <div className="mt-2">
                  <Button
                    tone="quiet"
                    disabled={merge.isPending}
                    onClick={() => {
                      setError("");
                      merge.mutate(
                        {
                          params: { path: { group_id: moveTo } },
                          body: { guest_id: row.guestId },
                        },
                        { onSuccess: onSaved, onError: fail },
                      );
                    }}
                  >
                    {merge.isPending ? "Movendo…" : "Mover agora"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {creating ? (
            <Rotulado label="Onde esta pessoa entra">
              <Select
                searchable
                value={moveTo}
                onChange={setMoveTo}
                placeholder="— num convite só dela —"
                options={[
                  { value: "", label: "— num convite só dela —" },
                  ...invitations.map(([id, text]) => ({
                    value: id,
                    label: text,
                  })),
                ]}
              />
            </Rotulado>
          ) : null}

          {!creating ? (
            <div>
              <span className="font-body text-sm text-dark-gray">
                Acrescentar alguém a este convite
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  value={companion}
                  onChange={(e) => setCompanion(e.target.value)}
                  placeholder="Nome de quem vem junto"
                  className="min-h-10 min-w-0 flex-1 border border-olive-line bg-cream px-3 font-body text-base text-ink placeholder:text-dark-gray/45 focus:border-olive"
                />
                <Button
                  tone="quiet"
                  disabled={!companion.trim() || addCompanion.isPending}
                  onClick={() => {
                    setError("");
                    addCompanion.mutate(
                      {
                        body: {
                          full_name: companion.trim(),
                          group_id: row.groupId,
                        } as never,
                      },
                      { onSuccess: onSaved, onError: fail },
                    );
                  }}
                >
                  {addCompanion.isPending ? "Acrescentando…" : "Acrescentar"}
                </Button>
              </div>

              {/* Typing a name creates somebody; picking one from here moves
                  somebody who already exists. Both are "acrescentar alguém" to
                  the couple, and which one it is depends on whether the person
                  is already on the list — a question the panel can answer
                  itself instead of asking. */}
              {jaExistem.length > 0 ? (
                <ul className="mt-1 border border-olive-line bg-cream">
                  {jaExistem.map((person) => (
                    <li key={person.guestId}>
                      <button
                        type="button"
                        disabled={merge.isPending}
                        onClick={() => {
                          setError("");
                          merge.mutate(
                            {
                              params: { path: { group_id: row.groupId } },
                              body: { guest_id: person.guestId },
                            },
                            { onSuccess: onSaved, onError: fail },
                          );
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left font-body text-sm text-ink transition-colors hover:bg-veil hover:text-olive disabled:opacity-40"
                      >
                        <span className="min-w-0 truncate">
                          {person.fullName}
                        </span>
                        <span className="shrink-0 font-body text-xs text-dark-gray">
                          já está na lista · trazer
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <Notice kind="error">{error}</Notice>
      </div>
    </Modal>
  );
}

/**
 * One label style for the whole modal.
 *
 * Field writes its label in sentence case and Select writes its in tracked
 * uppercase — both fine, and side by side in the same form they read as two
 * forms stitched together. Here the modal decides, and Select is asked for the
 * box without a label of its own.
 */
function Rotulado({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-body text-sm text-dark-gray">{label}</span>
      {children}
    </label>
  );
}

function Pick({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <Rotulado label={label}>
      <Select
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: "—" },
          ...options.map((key) => ({ value: key, label: labels[key] ?? key })),
        ]}
      />
    </Rotulado>
  );
}
