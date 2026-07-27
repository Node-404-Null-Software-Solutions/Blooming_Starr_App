import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadTypeScriptModule(relativeUrl, requireModule = () => ({})) {
  const source = readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
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
    requireModule
  );
  return loadedModule.exports;
}

const businessContextModule = loadTypeScriptModule(
  "../src/lib/business-context.ts"
);

class RedirectError extends Error {
  constructor(path) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

function createAuthzHarness({ userId = "user-a", memberships = [] } = {}) {
  const calls = [];
  const profile = { id: "profile-a", userId, activeBusinessId: null };
  const db = {
    membership: {
      findFirst: async (args) => {
        calls.push({ model: "membership", args });
        const where = args.where ?? {};
        return (
          memberships.find((membership) => {
            if (where.userId && membership.userId !== where.userId) return false;
            if (where.status && membership.status !== where.status) return false;
            if (
              where.businessId &&
              membership.businessId !== where.businessId
            ) {
              return false;
            }
            if (
              where.business?.slug &&
              membership.business.slug !== where.business.slug
            ) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
    },
    profile: {
      findUnique: async () => ({ ...profile }),
      upsert: async ({ update }) => ({ ...profile, ...update }),
    },
  };

  const authz = loadTypeScriptModule("../src/lib/authz.ts", (moduleName) => {
    if (moduleName === "@clerk/nextjs/server") {
      return { auth: async () => ({ userId }) };
    }
    if (moduleName === "next/navigation") {
      return {
        redirect: (path) => {
          throw new RedirectError(path);
        },
      };
    }
    if (moduleName === "node:crypto") {
      return { randomUUID: () => "request-test" };
    }
    if (moduleName === "@/lib/db") return { db };
    if (moduleName === "@/lib/business-context") {
      return businessContextModule;
    }
    throw new Error(`Unexpected test import: ${moduleName}`);
  });

  return { authz, calls };
}

function membership({
  businessId = "business-a",
  businessSlug = "business-a",
  role = "OWNER",
  status = "ACTIVE",
} = {}) {
  return {
    id: `membership-${businessId}`,
    businessId,
    userId: "user-a",
    role,
    status,
    business: { id: businessId, slug: businessSlug, name: businessSlug },
  };
}

test("a Business A member cannot resolve a Business B context", async () => {
  const harness = createAuthzHarness({ memberships: [membership()] });

  await assert.rejects(
    harness.authz.requireBusinessMembership("business-b"),
    (error) => error instanceof RedirectError && error.path === "/app"
  );
  assert.equal(
    harness.calls[0].args.where.business.slug,
    "business-b"
  );
});

test("disabled memberships cannot produce a BusinessContext", async () => {
  const harness = createAuthzHarness({
    memberships: [membership({ status: "DISABLED" })],
  });

  await assert.rejects(
    harness.authz.requireBusinessMembership("business-a"),
    (error) => error instanceof RedirectError && error.path === "/app"
  );
});

test("an allowed membership creates an immutable context from that membership", async () => {
  const harness = createAuthzHarness({ memberships: [membership()] });

  const result = await harness.authz.requireBusinessMembership("business-a");

  assert.equal(result.businessContext.businessId, "business-a");
  assert.equal(result.businessContext.membershipId, "membership-business-a");
  assert.equal(Object.isFrozen(result.businessContext), true);
});

test("business role enforcement redirects before returning a privileged context", async () => {
  const harness = createAuthzHarness({
    memberships: [membership({ role: "EMPLOYEE" })],
  });

  await assert.rejects(
    harness.authz.requireBusinessRole("business-a", ["OWNER"]),
    (error) =>
      error instanceof RedirectError && error.path === "/app/business-a"
  );
});
