import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const API = "https://commons.wikimedia.org/w/api.php";
const OUT = "public/materials";
const W = 900;
const H = 700;

const subjects = [
  ["cat-cement", ["cement bags", "cement bags stacked"]],
  ["cat-iron-rods", ["rebar", "reinforcement steel bars"]],
  ["cat-tiles", ["floor tiles", "porcelain tiles flooring"]],
  ["cat-roofing", ["color coated roofing sheets", "corrugated metal roofing sheets"]],
  ["cat-plumbing", ["pvc pipe", "plumbing pipes"]],
  ["cat-electricals", ["electrical cable", "electrical wiring"]],
  ["ghacem-supacem-42-5", ["cement bags", "cement sacks"]],
  ["dangote-cement-42-5", ["bagged cement", "cement bags"]],
  ["cestos-cement-32-5", ["cement bags pile", "cement sacks warehouse"]],
  ["deformed-bar-12mm", ["rebar bundle", "steel rebar", "rebar"]],
  ["deformed-bar-16mm", ["steel reinforcement bars", "rebar construction steel"]],
  ["binding-wire-roll", ["wire coil steel", "tie wire"]],
  ["porcelain-floor-60x60", ["floor tiles", "porcelain tiles flooring"]],
  ["ceramic-wall-30x60", ["ceramic wall tiles", "wall tiles bathroom"]],
  ["porcelain-floor-80x80", ["floor tiles", "polished tiles"]],
  ["long-span-roofing-sheet", ["color coated roofing sheets", "metal roofing sheet"]],
  ["roofing-roofmate-r", ["color coated roofing sheets", "roofing sheets"]],
  ["roofing-nails-2kg", ["roofing nails", "roof nails"]],
  ["pvc-pipe-6-inch", ["large pvc pipe", "pvc pipe"]],
  ["pvc-pipe-1-5-inch", ["pvc pipes", "plastic water pipe"]],
  ["bathroom-faucet-set", ["water tap", "kitchen faucet", "bathroom tap", "faucet"]],
  ["electric-cable-2-5mm", ["electric cable", "copper wire cable", "electrical wire"]],
  ["surface-mount-socket", ["electrical socket", "wall socket", "power socket"]],
  ["led-bulb-15w", ["led light bulb", "led bulb"]],
  ["cat-blocks", ["concrete blocks", "hollow concrete blocks", "sandcrete blocks"]],
  ["cat-paint", ["paint buckets", "paint cans", "emulsion paint"]],
  ["cat-other", ["building materials", "construction materials"]],
  ["hollow-block-6-inch", ["hollow concrete block", "concrete blocks"]],
  ["hollow-block-9-inch", ["concrete block wall", "concrete masonry blocks"]],
  ["sandcrete-solid-block", ["sandcrete block", "solid concrete blocks"]],
  ["interior-emulsion-20l", ["paint buckets", "emulsion paint"]],
  ["exterior-paint-20l", ["house paint cans", "exterior paint"]],
  ["paint-primer-20l", ["paint buckets", "primer paint"]],
  ["paint-thinner-5l", ["paint thinner", "thinner can"]],
  ["sharp-sand", ["sand pile construction", "building sand"]],
  ["wheelbarrow", ["wheelbarrow", "construction wheelbarrow"]],
  ["shovel-spade-set", ["shovel and spade", "garden shovel spade", "spade shovel"]],
];

const REUSABLE = /^(cc0|cc by|cc by-sa|public domain)/;
const FORBIDDEN = /[-_]nc\b|[-_]nd\b/;
const TITLE_BLACKLIST = /model|dress|debris|asbestos|fountain|rabbit|female|woman|portrait|mural|palace|church|court|castle|tomb|artifact|burned|ruin|legged|construction update|nara[i-]|wwii|war|military|soldier|vehicle|car|tank|airport|aircraft|person|people/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}

let requestedKeys = process.argv.slice(2);

const PINNED_TITLES = {
  "cat-cement": "File:Portland Cement Bags.jpg",
  "ghacem-supacem-42-5": "File:Cement Baggies.jpg",
  "dangote-cement-42-5": "File:Cement bags in Douma.jpg",
  "cestos-cement-32-5": "File:Portland Cement Bags.jpg",
};

const CATEGORY_KEYS = {
  "cat-cement": ["Cement bags"],
  "ghacem-supacem-42-5": ["Cement bags"],
  "dangote-cement-42-5": ["Cement bags"],
  "cestos-cement-32-5": ["Cement bags"],
  "cat-tiles": ["Floor tiles"],
  "porcelain-floor-60x60": ["Floor tiles"],
  "ceramic-wall-30x60": ["Floor tiles"],
  "porcelain-floor-80x80": ["Floor tiles"],
  "bathroom-faucet-set": ["Faucets"],
  "pvc-pipe-6-inch": ["PVC pipes"],
  "pvc-pipe-1-5-inch": ["PVC pipes"],
  "cat-blocks": ["Concrete blocks"],
  "hollow-block-6-inch": ["Concrete blocks"],
  "hollow-block-9-inch": ["Concrete blocks"],
  "sandcrete-solid-block": ["Concrete blocks"],
  "cat-paint": ["Paint buckets", "Paints"],
  "interior-emulsion-20l": ["Paint buckets"],
  "exterior-paint-20l": ["Paint buckets"],
  "paint-primer-20l": ["Paint buckets"],
  "cat-other": ["Construction materials"],
  "sharp-sand": ["Sand"],
};

async function searchCategory(name, attempt = 0) {
  const url =
    API +
    "?action=query&generator=categorymembers&gcmtitle=" +
    encodeURIComponent("Category:" + name) +
    "&gcmtype=file&gcmnamespace=6&gcmlimit=50&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json";
  const res = await fetch(url);
  if (res.status === 429 && attempt < 6) {
    await sleep(1500 * (attempt + 1));
    return searchCategory(name, attempt + 1);
  }
  if (!res.ok) throw new Error(`category ${res.status} for "${name}"`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});
  const hits = [];
  for (const page of pages) {
    const ii = page?.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(page.title)) continue;
    const lic = cleanHtml(ii.extmetadata?.LicenseShortName?.value).toLowerCase();
    if (!REUSABLE.test(lic) || FORBIDDEN.test(lic)) continue;
    if (TITLE_BLACKLIST.test(page.title)) continue;
    hits.push({
      url: ii.thumburl,
      origUrl: ii.url,
      title: page.title,
      lic: cleanHtml(ii.extmetadata?.LicenseShortName?.value),
      artist: cleanHtml(ii.extmetadata?.Artist?.value),
    });
  }
  return hits;
}

async function search(query, attempt = 0) {
  const url =
    API +
    "?action=query&generator=search&gsrsearch=" +
    encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json";
  const res = await fetch(url);
  if (res.status === 429 && attempt < 6) {
    await sleep(1500 * (attempt + 1));
    return search(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`search ${res.status} for "${query}"`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});
  const hits = [];
  for (const page of pages) {
    const ii = page?.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(page.title)) continue;
    const lic = cleanHtml(ii.extmetadata?.LicenseShortName?.value).toLowerCase();
    if (!REUSABLE.test(lic) || FORBIDDEN.test(lic)) continue;
    if (TITLE_BLACKLIST.test(page.title)) continue;
    hits.push({
      url: ii.thumburl,
      origUrl: ii.url,
      title: page.title,
      lic: cleanHtml(ii.extmetadata?.LicenseShortName?.value),
      artist: cleanHtml(ii.extmetadata?.Artist?.value),
    });
  }
  return hits;
}

async function fetchByTitle(title, attempt = 0) {
  const url =
    API +
    "?action=query&titles=" +
    encodeURIComponent(title) +
    "&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json";
  const res = await fetch(url);
  if (res.status === 429 && attempt < 6) {
    await sleep(1500 * (attempt + 1));
    return fetchByTitle(title, attempt + 1);
  }
  if (!res.ok) throw new Error(`title ${res.status} for "${title}"`);
  const page = Object.values((await res.json())?.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.thumburl) throw new Error("no image data for: " + title);
  return {
    url: ii.thumburl,
    origUrl: ii.url,
    title: page.title,
    lic: cleanHtml(ii.extmetadata?.LicenseShortName?.value),
    artist: cleanHtml(ii.extmetadata?.Artist?.value),
  };
}

async function pickByKey(key, queries) {
  if (PINNED_TITLES[key]) return fetchByTitle(PINNED_TITLES[key]);
  for (const cat of CATEGORY_KEYS[key] ?? []) {
    const hits = await searchCategory(cat);
    if (hits.length) {
      const slot = Math.min(Math.floor(hits.length * 0.4), hits.length - 1);
      return { ...hits[slot], usedQuery: "Category:" + cat };
    }
    await sleep(700);
  }
  for (const query of queries) {
    const hits = await search(query);
    if (hits.length) {
      return { ...hits[0], usedQuery: query };
    }
    await sleep(700);
  }
  throw new Error("no reusable image for: " + key);
}

await mkdir(OUT, { recursive: true });
const credits = [];
const failures = [];

let existingCredits = [];
try {
  existingCredits = JSON.parse(await readFile(`${OUT}/credits.json`, "utf8")).images ?? [];
} catch {
  /* no existing credits to preserve */
}

for (const [key, queries] of subjects) {
  if (requestedKeys.length && !requestedKeys.includes(key)) continue;
  try {
    await sleep(900);
    const meta = await pickByKey(key, queries);
    let buf = Buffer.from(await (await fetch(meta.url)).arrayBuffer());
    let jpg;
    try {
      jpg = await sharp(buf).resize(W, H, { fit: "cover", position: "centre" }).jpeg({ quality: 80, progressive: true }).toBuffer();
    } catch (formatErr) {
      buf = Buffer.from(await (await fetch(meta.origUrl)).arrayBuffer());
      jpg = await sharp(buf).resize(W, H, { fit: "cover", position: "centre" }).jpeg({ quality: 80, progressive: true }).toBuffer();
    }
    await writeFile(`${OUT}/${key}.jpg`, jpg);
    credits.push({ key, file: `materials/${key}.jpg`, title: meta.title, license: meta.lic, artist: meta.artist, source: meta.url, query: meta.usedQuery });
    console.log(`ok ${key}  ::  ${meta.title}`);
  } catch (err) {
    failures.push([key, err.message]);
    console.log(`FAIL ${key}: ${err.message}`);
  }
}

const regeneratedKeys = new Set(credits.map((c) => c.key));
const preserved = existingCredits.filter((c) => !regeneratedKeys.has(c.key));
const allCredits = [...preserved, ...credits];
await writeFile(`${OUT}/credits.json`, JSON.stringify({ generated: new Date().toISOString(), images: allCredits }, null, 2));
console.log(`\n${credits.length}/${subjects.length} images; failures: ${failures.length}`);
for (const [key, msg] of failures) console.log(`  - ${key}: ${msg}`);
process.exit(failures.length ? 1 : 0);