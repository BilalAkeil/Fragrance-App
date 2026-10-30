// Imports catalogue houses, fragrances and sizes from a CSV (spec 002, Q-1).
// Run by hand:
//
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//     npx tsx scripts/import-catalogue.ts supabase/catalogue/starter.csv
//
// Add --check to only check the file, without connecting or writing anything.
//
// Columns: house, name, concentration, year, size_ml, guide_price (in pounds).
// Houses and fragrances that already exist are reused (matched ignoring case);
// a size that exists gets the new guide price, which is recorded in its history.
// Nothing is written if any row has a problem.
//
// The starter CSV's guide prices are placeholder sample values, not researched prices.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseCatalogueRow, type CatalogueRow } from "@fragrance/core";

// Splits CSV text into rows of cells. Handles quoted cells with commas and "" escapes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const file = args.find((a) => !a.startsWith("--"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!file || (!checkOnly && (!url || !serviceKey))) {
    console.error(
      "Usage: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npx tsx scripts/import-catalogue.ts <file.csv> [--check]",
    );
    process.exit(1);
  }

  const [header, ...lines] = parseCsv(readFileSync(file, "utf8"));
  const columns = header.map((h) => h.trim().toLowerCase());
  const rows: CatalogueRow[] = [];
  const problems: string[] = [];
  lines.forEach((cells, i) => {
    const result = parseCatalogueRow(Object.fromEntries(columns.map((c, j) => [c, cells[j]])));
    if ("errors" in result) problems.push(`Line ${i + 2}: ${result.errors.join(" ")}`);
    else rows.push(result);
  });
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  if (checkOnly) {
    console.log(`${rows.length} rows look fine.`);
    return;
  }

  const supabase = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  const { data: houseRows, error: houseError } = await supabase.from("houses").select("id, name");
  fail("Reading houses", houseError);
  const houses = new Map((houseRows ?? []).map((h) => [h.name.toLowerCase(), h.id as string]));
  const { data: fragranceRows, error: fragranceError } = await supabase
    .from("fragrances")
    .select("id, house_id, name, concentration");
  fail("Reading fragrances", fragranceError);
  const fragranceKey = (houseId: string, name: string, concentration: string) =>
    `${houseId}|${name.toLowerCase()}|${concentration}`;
  const fragrances = new Map(
    (fragranceRows ?? []).map((f) => [fragranceKey(f.house_id, f.name, f.concentration), f.id as string]),
  );

  const added = { houses: 0, fragrances: 0 };
  for (const row of rows) {
    let houseId = houses.get(row.house.toLowerCase());
    if (!houseId) {
      const { data, error } = await supabase.from("houses").insert({ name: row.house }).select("id").single();
      fail(`Adding ${row.house}`, error);
      houseId = data!.id as string;
      houses.set(row.house.toLowerCase(), houseId);
      added.houses++;
    }
    const key = fragranceKey(houseId, row.name, row.concentration);
    let fragranceId = fragrances.get(key);
    if (!fragranceId) {
      const { data, error } = await supabase
        .from("fragrances")
        .insert({ house_id: houseId, name: row.name, concentration: row.concentration, launch_year: row.launchYear ?? null })
        .select("id")
        .single();
      fail(`Adding ${row.house} ${row.name}`, error);
      fragranceId = data!.id as string;
      fragrances.set(key, fragranceId);
      added.fragrances++;
    }
    const { error } = await supabase
      .from("fragrance_sizes")
      .upsert(
        { fragrance_id: fragranceId, size_ml: row.sizeMl, guide_price_pence: row.guidePricePence },
        { onConflict: "fragrance_id,size_ml" },
      );
    fail(`Setting ${row.house} ${row.name} ${row.sizeMl}ml`, error);
  }
  console.log(`Imported ${rows.length} sizes: ${added.houses} new houses, ${added.fragrances} new fragrances.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
