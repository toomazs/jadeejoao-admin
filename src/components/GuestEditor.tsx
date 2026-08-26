import { useState } from "react";

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
  const [ceremonyRole, setCeremonyRole] = useState(row.ceremonyRole);
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

  const fail = (err: unknown) => setError(problemDetail(err));

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
      // No rename step: a new person's invitation is labelled with their name,
      // and there is nothing yet to have renamed.
      create.mutate(
        { body: details as never },
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

        {creating ? null : <hr className="my-1 border-sand-line" />}

        {/* The label titles the invitation on the site, where the guest finds
            it. Alone it is simply their name, and renaming it says nothing —
            so it only appears once the invitation holds more than one person
            and "Família Nascimento" starts to mean something. */}
        {!creating && row.groupSize > 1 ? (
          <Field
            label="Nome do convite"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint={`O título que ${row.groupSize} pessoas veem ao encontrar este convite.`}
          />
        ) : null}

        {creating ? null : (
          <>
            <div>
              <Select
                label="Juntar a outro convite"
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
              <p className="mt-1 font-body text-xs text-dark-gray">
                Quem responde continua sendo o principal do convite de destino.
              </p>
            </div>

            {moveTo ? (
              <Button
                tone="quiet"
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
                disabled={merge.isPending}
              >
                {merge.isPending ? "Movendo…" : "Mover agora"}
              </Button>
            ) : null}

            {/* The other direction, and the one the couple asks for more
                often: not moving this person somewhere else, but adding
                somebody beside them. A husband, a plus-one — one invitation,
                one person answering for both. */}
            <div className="border-t border-sand-line pt-3">
              <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
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
              <p className="mt-1 font-body text-xs text-dark-gray">
                {row.fullName || "Esta pessoa"} continua respondendo pelo
                convite.
              </p>
            </div>
          </>
        )}

        <Notice kind="error">{error}</Notice>
      </div>
    </Modal>
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
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: "", label: "—" },
        ...options.map((key) => ({ value: key, label: labels[key] ?? key })),
      ]}
    />
  );
}
