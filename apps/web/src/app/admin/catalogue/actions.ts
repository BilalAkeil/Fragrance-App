"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONCENTRATIONS, guidePriceError, parseNotes, parsePounds, type Concentration } from "@fragrance/core";
import { createClient } from "@/lib/supabase/server";

// Catalogue admin (spec 002, AC-3). Writes go through the admin's own client:
// RLS lets only admins change the catalogue, and matching and merging are
// security-definer functions that check is_admin() again.

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function fragranceFields(formData: FormData) {
  const concentration = text(formData, "concentration") as Concentration;
  const year = text(formData, "launchYear");
  return {
    name: text(formData, "name"),
    concentration: CONCENTRATIONS.includes(concentration) ? concentration : undefined,
    launch_year: year ? Number(year) : null,
    aliases: parseNotes(text(formData, "aliases")),
  };
}

// 23505 is Postgres's unique violation: the entry is already there (R-1).
const errorCode = (error: { code?: string }) => (error.code === "23505" ? "duplicate" : "save");

function done(path: string, query = ""): never {
  revalidatePath("/admin/catalogue", "layout");
  redirect(`${path}${query}`);
}

export async function addHouse(formData: FormData) {
  const name = text(formData, "name");
  if (!name) redirect("/admin/catalogue?error=house");
  const supabase = await createClient();
  const { error } = await supabase.from("houses").insert({ name, aliases: parseNotes(text(formData, "aliases")) });
  if (error) redirect(`/admin/catalogue?error=${errorCode(error)}`);
  done("/admin/catalogue", `?added=${encodeURIComponent(name)}`);
}

export async function updateHouse(formData: FormData) {
  const name = text(formData, "name");
  if (!name) redirect("/admin/catalogue?error=house");
  const supabase = await createClient();
  const { error } = await supabase
    .from("houses")
    .update({ name, aliases: parseNotes(text(formData, "aliases")) })
    .eq("id", text(formData, "id"));
  if (error) redirect(`/admin/catalogue?error=${errorCode(error)}`);
  done("/admin/catalogue");
}

export async function addFragrance(formData: FormData) {
  const fields = fragranceFields(formData);
  const houseId = text(formData, "houseId");
  if (!houseId || !fields.name || !fields.concentration) redirect("/admin/catalogue?error=fragrance");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fragrances")
    .insert({ ...fields, house_id: houseId })
    .select("id")
    .single();
  if (error) redirect(`/admin/catalogue?error=${errorCode(error)}`);
  done(`/admin/catalogue/${data.id}`);
}

export async function updateFragrance(formData: FormData) {
  const id = text(formData, "id");
  const fields = fragranceFields(formData);
  if (!fields.name || !fields.concentration) redirect(`/admin/catalogue/${id}?error=fragrance`);
  const supabase = await createClient();
  const { error } = await supabase.from("fragrances").update(fields).eq("id", id);
  if (error) redirect(`/admin/catalogue/${id}?error=${errorCode(error)}`);
  done(`/admin/catalogue/${id}`, "?saved=1");
}

// Adds a size, or sets a new guide price on an existing one. The database
// records every price change and who made it (AC-3.4).
export async function setSize(formData: FormData) {
  const fragranceId = text(formData, "fragranceId");
  const sizeMl = Number(text(formData, "sizeMl"));
  const pricePence = parsePounds(text(formData, "guidePrice"));
  if (!Number.isInteger(sizeMl) || sizeMl <= 0) redirect(`/admin/catalogue/${fragranceId}?error=size`);
  if (guidePriceError(pricePence)) redirect(`/admin/catalogue/${fragranceId}?error=price`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("fragrance_sizes")
    .upsert(
      { fragrance_id: fragranceId, size_ml: sizeMl, guide_price_pence: pricePence },
      { onConflict: "fragrance_id,size_ml" },
    );
  if (error) redirect(`/admin/catalogue/${fragranceId}?error=save`);
  done(`/admin/catalogue/${fragranceId}`, "?saved=1");
}

export async function mergeFragrance(formData: FormData) {
  const fromId = text(formData, "fromId");
  const toId = text(formData, "toId");
  if (!toId) redirect(`/admin/catalogue/${fromId}?error=merge`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_merge_fragrance", { from_id: fromId, to_id: toId });
  if (error) redirect(`/admin/catalogue/${fromId}?error=merge`);
  done(`/admin/catalogue/${toId}`, "?merged=1");
}

// Matches an unmatched listing or bottle to a catalogue fragrance (AC-3.2).
async function match(itemType: string, itemId: string, fragranceId: string) {
  const supabase = await createClient();
  const { error } =
    itemType === "bottle"
      ? await supabase.rpc("admin_match_bottle", { bottle_id: itemId, fragrance_id: fragranceId })
      : await supabase.rpc("admin_match_listing", { listing_id: itemId, fragrance_id: fragranceId });
  return error;
}

export async function matchItem(formData: FormData) {
  const fragranceId = text(formData, "fragranceId");
  if (!fragranceId) redirect(`/admin/catalogue/unmatched?error=pick&item=${text(formData, "itemId")}`);
  const error = await match(text(formData, "itemType"), text(formData, "itemId"), fragranceId);
  if (error) redirect(`/admin/catalogue/unmatched?error=save&item=${text(formData, "itemId")}`);
  done("/admin/catalogue/unmatched", "?matched=1");
}

// "Add new": adds the house (if it's new) and the fragrance, then matches the item to it.
export async function addAndMatch(formData: FormData) {
  const itemId = text(formData, "itemId");
  const houseName = text(formData, "house");
  const fields = fragranceFields(formData);
  if (!houseName || !fields.name || !fields.concentration) {
    redirect(`/admin/catalogue/unmatched?error=fragrance&item=${itemId}`);
  }
  const supabase = await createClient();

  // Same name ignoring case, with % and _ escaped so they aren't wildcards.
  const { data: existingHouse } = await supabase
    .from("houses")
    .select("id")
    .ilike("name", houseName.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();
  let houseId = existingHouse?.id as string | undefined;
  if (!houseId) {
    const { data, error } = await supabase.from("houses").insert({ name: houseName }).select("id").single();
    if (error) redirect(`/admin/catalogue/unmatched?error=save&item=${itemId}`);
    houseId = data.id as string;
  }

  const { data: added, error } = await supabase
    .from("fragrances")
    .insert({ ...fields, house_id: houseId })
    .select("id")
    .single();
  if (error) redirect(`/admin/catalogue/unmatched?error=${errorCode(error)}&item=${itemId}`);

  const matchError = await match(text(formData, "itemType"), itemId, added.id as string);
  if (matchError) redirect(`/admin/catalogue/unmatched?error=save&item=${itemId}`);
  done(`/admin/catalogue/${added.id}`, "?added=1");
}
