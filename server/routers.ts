import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { listSellers, listListings, listOrders, listOrdersForBuyer, listQuotesForBuyer, listDisputes, createQuote, updateQuoteStatus } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    sellers: publicProcedure.query(() => listSellers()),
    listings: publicProcedure.query(() => listListings()),
    orders: protectedProcedure.query(({ ctx }) => listOrdersForBuyer(ctx.user.id)),
    allOrders: protectedProcedure.query(() => listOrders()),
    disputes: protectedProcedure.query(() => listDisputes()),
    myQuotes: protectedProcedure.query(({ ctx }) => listQuotesForBuyer(ctx.user.id)),
    createQuote: protectedProcedure.input(z.object({ sellerId: z.number().int().positive(), listingId: z.number().int().positive(), quantity: z.number().int().positive(), targetPrice: z.string().min(1) })).mutation(({ ctx, input }) => createQuote({ ...input, buyerId: ctx.user.id, status: "sent" })),
    updateQuoteStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "sent", "countered", "accepted", "declined"]) })).mutation(({ input }) => updateQuoteStatus(input.id, input.status)),
  }),
  files: router({
    uploadReference: protectedProcedure
      .input(z.object({
        filename: z.string().min(1).max(180),
        contentType: z.string().min(1).max(120),
        contentBase64: z.string().min(1),
        scope: z.enum(["onboarding", "listing-media", "spec-sheet"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
        const key = `marketplace/${input.scope}/${ctx.user.id}/${safeFilename}`;
        const bytes = Buffer.from(input.contentBase64, "base64");
        const stored = await storagePut(key, bytes, input.contentType);
        return { ...stored, filename: input.filename, contentType: input.contentType, bytes: bytes.byteLength, scope: input.scope };
      }),
  }),
});

export type AppRouter = typeof appRouter;
