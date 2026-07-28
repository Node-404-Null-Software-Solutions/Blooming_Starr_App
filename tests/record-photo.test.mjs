import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/record-photo.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loadedModule = { exports: {} };
new Function("exports", "module", "require", compiled)(
  loadedModule.exports,
  loadedModule,
  () => ({})
);

const {
  MAX_RECORD_PHOTO_BYTES,
  detectRecordPhotoContentType,
  readRecordPhoto,
  recordPhotoUrl,
} = loadedModule.exports;

test("record photos are identified by file signature, not browser MIME type", async () => {
  assert.equal(
    detectRecordPhotoContentType(
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    ),
    "image/jpeg"
  );
  assert.equal(
    detectRecordPhotoContentType(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ),
    "image/png"
  );
  assert.equal(
    detectRecordPhotoContentType(
      new TextEncoder().encode("RIFF0000WEBP")
    ),
    "image/webp"
  );
  assert.equal(
    detectRecordPhotoContentType(new TextEncoder().encode("<svg></svg>")),
    null
  );

  const formData = new FormData();
  formData.set(
    "photo",
    new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "plant\nphoto.jpg",
      { type: "text/plain" }
    )
  );
  const result = await readRecordPhoto(formData);

  assert.equal(result.ok, true);
  assert.equal(result.photo.contentType, "image/jpeg");
  assert.equal(result.photo.originalName, "plantphoto.jpg");
});

test("record photo validation rejects unsupported and oversized uploads", async () => {
  const unsupported = new FormData();
  unsupported.set(
    "photo",
    new File([new TextEncoder().encode("<svg></svg>")], "photo.svg", {
      type: "image/svg+xml",
    })
  );
  assert.deepEqual(await readRecordPhoto(unsupported), {
    ok: false,
    error: "Photo must be a JPEG, PNG, or WebP image.",
  });

  const oversized = new FormData();
  oversized.set(
    "photo",
    new File([new Uint8Array(MAX_RECORD_PHOTO_BYTES + 1)], "large.jpg", {
      type: "image/jpeg",
    })
  );
  assert.deepEqual(await readRecordPhoto(oversized), {
    ok: false,
    error: "Photo must be 5 MB or smaller.",
  });
});

test("record photo URLs encode tenant and record identifiers and cache version", () => {
  assert.equal(
    recordPhotoUrl(
      "garden & gifts",
      "plant-intake",
      "plant/one",
      new Date("2026-07-27T12:00:00.000Z")
    ),
    "/api/record-photo/garden%20%26%20gifts/plant-intake/plant%2Fone?v=1785153600000"
  );
});

test("photo migration adds storage metadata to both intake tables", () => {
  const migration = readFileSync(
    new URL(
      "../prisma/migrations/20260727000001_add_intake_photos/migration.sql",
      import.meta.url
    ),
    "utf8"
  );

  for (const table of ["PlantIntake", "ProductIntake"]) {
    assert.match(migration, new RegExp(`ALTER TABLE "${table}"`));
  }
  for (const column of [
    "photoContentType",
    "photoData",
    "photoOriginalName",
    "photoUpdatedAt",
  ]) {
    assert.match(migration, new RegExp(`"${column}"`));
  }
});

test("photo delivery route authenticates before tenant-scoped repository lookup", () => {
  const route = readFileSync(
    new URL(
      "../src/app/api/record-photo/[businessSlug]/[recordType]/[id]/route.ts",
      import.meta.url
    ),
    "utf8"
  );

  const membershipIndex = route.indexOf("requireBusinessMembership(businessSlug)");
  const lookupIndex = route.indexOf(".findPhotoById(id)");
  assert.notEqual(membershipIndex, -1);
  assert.notEqual(lookupIndex, -1);
  assert.ok(membershipIndex < lookupIndex);
});
