import { asc } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, appUsers, cleaningZones, roles } from "@/db/schema";
import {
  inviteUser,
  removeUser,
  saveActivityType,
  saveBirthdayTemplate,
  saveRole,
  saveZone,
  updateUser,
} from "@/app/actions/settings";
import { SubmitButton } from "@/components/submit-button";
import { DEFAULT_BIRTHDAY_TEMPLATE, getActiveMembers, getSetting } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export default async function SettingsPage() {
  const me = await requireAdmin();
  const [users, roleList, typeList, zoneList, activeMembers, template] = await Promise.all([
    db.select().from(appUsers).orderBy(asc(appUsers.email)),
    db.select().from(roles).orderBy(asc(roles.sortOrder), asc(roles.name)),
    db.select().from(activityTypes).orderBy(asc(activityTypes.name)),
    db.select().from(cleaningZones).orderBy(asc(cleaningZones.sortOrder), asc(cleaningZones.name)),
    getActiveMembers(),
    getSetting("birthday_template", DEFAULT_BIRTHDAY_TEMPLATE),
  ]);
  const activeRoles = roleList.filter((r) => !r.archived);

  const memberOptions = (
    <>
      <option value="">Not linked</option>
      {activeMembers.map((m) => (
        <option key={m.id} value={m.id}>{m.fullName}</option>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <h1 className="h1">Settings</h1>

      {/* Users */}
      <section className="card space-y-3">
        <div>
          <h2 className="h2">People who can log in</h2>
          <p className="muted">
            Add their email here, then they create an account at the sign-up page with that same email. Link each
            coordinator to their member record so they see the services they coordinate.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <form action={updateUser} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <div className="min-w-48 flex-1 text-sm">
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-muted">{u.authUserId ? "Has signed in" : "Invited — not signed up yet"}</div>
                </div>
                <select name="role" defaultValue={u.role} className="input w-auto py-1" aria-label="Role">
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
                <select name="memberId" defaultValue={u.memberId ?? ""} className="input w-auto py-1" aria-label="Member">
                  {memberOptions}
                </select>
                <SubmitButton className="btn btn-sm">Save</SubmitButton>
              </form>
              {u.email !== me.email && (
                <form action={removeUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm={`Remove access for ${u.email}? They won't be able to log in.`} confirmLabel="Yes, remove">Remove</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={inviteUser} className="flex flex-wrap gap-2 border-t border-line pt-3">
          <input name="email" type="email" required placeholder="coordinator@email.com" className="input min-w-48 flex-1" />
          <select name="role" className="input w-auto" aria-label="Role">
            <option value="coordinator">Coordinator</option>
            <option value="admin">Admin</option>
          </select>
          <select name="memberId" className="input w-auto" aria-label="Member">{memberOptions}</select>
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>

      {/* Roles */}
      <section className="card space-y-3">
        <div>
          <h2 className="h2">Service roles</h2>
          <p className="muted">Roles coordinators fill each day (the coordinator role is built in).</p>
        </div>
        <div className="space-y-2">
          {roleList.map((r) => (
            <form key={r.id} action={saveRole} className={`flex flex-wrap items-end gap-2 ${r.archived ? "opacity-50" : ""}`}>
              <input type="hidden" name="id" value={r.id} />
              <NameField defaultValue={r.name} />
              <NumberField name="peopleNeeded" label="People" defaultValue={r.peopleNeeded} />
              <NumberField name="sortOrder" label="Order" defaultValue={r.sortOrder} />
              <label className="flex items-center gap-1 pb-2 text-xs text-muted">
                <input type="checkbox" name="archived" defaultChecked={r.archived} /> Archived
              </label>
              <SubmitButton className="btn btn-sm mb-1">Save</SubmitButton>
            </form>
          ))}
        </div>
        <form action={saveRole} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <NameField placeholder="e.g. Bible Reading" />
          <NumberField name="peopleNeeded" label="People" defaultValue={1} />
          <NumberField name="sortOrder" label="Order" defaultValue={roleList.length + 1} />
          <SubmitButton className="btn-primary mb-1">+ Add role</SubmitButton>
        </form>
      </section>

      {/* Activity types */}
      <section className="card space-y-3">
        <div>
          <h2 className="h2">Activity types</h2>
          <p className="muted">The roles and cleaning each new day starts with. Any single day can still be changed.</p>
        </div>
        {[...typeList, null].map((t) => (
          <form
            key={t?.id ?? "new"}
            action={saveActivityType}
            className={`space-y-2 rounded-lg border border-line p-3 ${t?.archived ? "opacity-50" : ""}`}
          >
            {t && <input type="hidden" name="id" value={t.id} />}
            <div className="flex flex-wrap items-end gap-2">
              <NameField defaultValue={t?.name} placeholder="e.g. Youth meeting" />
              <label className="flex items-center gap-1 pb-2 text-sm">
                <input type="checkbox" name="hasCleaning" defaultChecked={t?.hasCleaning ?? false} /> Cleaning
              </label>
              {t && (
                <label className="flex items-center gap-1 pb-2 text-xs text-muted">
                  <input type="checkbox" name="archived" defaultChecked={t.archived} /> Archived
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="text-xs text-muted">Default roles:</span>
              {activeRoles.map((r) => (
                <label key={r.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="defaultRoleIds"
                    value={r.id}
                    defaultChecked={t?.defaultRoleIds.includes(r.id) ?? false}
                  />
                  {r.name}
                </label>
              ))}
            </div>
            <SubmitButton className={t ? "btn btn-sm" : "btn-primary btn-sm"}>{t ? "Save" : "+ Add type"}</SubmitButton>
          </form>
        ))}
      </section>

      {/* Zones */}
      <section className="card space-y-3">
        <div>
          <h2 className="h2">Cleaning zones</h2>
          <p className="muted">People = how many clean the area. The same people clean before and after the service. &quot;Only&quot; limits a zone to members of that gender (members without a gender recorded can still be picked).</p>
        </div>
        <div className="space-y-2">
          {zoneList.map((z) => (
            <form key={z.id} action={saveZone} className={`flex flex-wrap items-end gap-2 ${z.archived ? "opacity-50" : ""}`}>
              <input type="hidden" name="id" value={z.id} />
              <NameField defaultValue={z.name} />
              <NumberField name="peopleNeeded" label="People" defaultValue={z.peopleNeeded} />
              <NumberField name="sortOrder" label="Order" defaultValue={z.sortOrder} />
              <GenderField defaultValue={z.genderRule ?? ""} />
              <label className="flex items-center gap-1 pb-2 text-xs text-muted">
                <input type="checkbox" name="archived" defaultChecked={z.archived} /> Archived
              </label>
              <SubmitButton className="btn btn-sm mb-1">Save</SubmitButton>
            </form>
          ))}
        </div>
        <form action={saveZone} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <NameField placeholder="e.g. Car park" />
          <NumberField name="peopleNeeded" label="People" defaultValue={1} />
          <NumberField name="sortOrder" label="Order" defaultValue={zoneList.length + 1} />
          <GenderField defaultValue="" />
          <SubmitButton className="btn-primary mb-1">+ Add zone</SubmitButton>
        </form>
      </section>

      {/* Birthday template */}
      <section className="card space-y-3">
        <div>
          <h2 className="h2">Birthday message</h2>
          <p className="muted">
            Used by the &quot;Copy WhatsApp message&quot; button. <code>{"{name}"}</code> is replaced with the member&apos;s name.
          </p>
        </div>
        <form action={saveBirthdayTemplate} className="space-y-2">
          <textarea name="template" rows={5} defaultValue={template} className="input" />
          <SubmitButton>Save message</SubmitButton>
        </form>
      </section>
    </div>
  );
}

function NameField({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return (
    <div className="min-w-44 flex-1">
      <label className="label">Name</label>
      <input name="name" required defaultValue={defaultValue} placeholder={placeholder} className="input py-1.5" />
    </div>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <div className="w-20">
      <label className="label">{label}</label>
      <input name={name} type="number" min={0} defaultValue={defaultValue} className="input py-1.5" />
    </div>
  );
}

function GenderField({ defaultValue }: { defaultValue: string }) {
  return (
    <div>
      <label className="label">Only</label>
      <select name="genderRule" defaultValue={defaultValue} className="input py-1.5">
        <option value="">Anyone</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
    </div>
  );
}
