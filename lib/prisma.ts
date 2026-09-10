import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma interactive transactions default to a 5s timeout. Block 3 production
// verification demonstrated that the intentionally multi-step SafeDelete DB
// transaction can exceed that bound on a cold serverless execution even though
// it performs no network I/O inside the transaction. Keep a finite 15s ceiling
// so the erasure path has operational headroom without allowing unbounded locks.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    transactionOptions: {
      timeout: 15_000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
