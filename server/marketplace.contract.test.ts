import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("marketplace router contracts", () => {
  it("allows a public catalog read when the database is unavailable", async () => {
    const result = await appRouter.createCaller(context).marketplace.listings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("protects buyer quote reads", async () => {
    await expect(appRouter.createCaller(context).marketplace.myQuotes()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
