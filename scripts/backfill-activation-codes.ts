import { PrismaClient } from "@prisma/client";
import {
  activationCodeNeedsBackfill,
  protectActivationCode,
  revealActivationCode,
} from "../domains/chips/activation-code.service";

const prisma = new PrismaClient();
const shouldApply = process.argv.includes("--apply");
const BATCH_SIZE = 200;

async function main() {
  let cursor: string | undefined;
  let inspected = 0;
  let pending = 0;
  let updated = 0;

  for (;;) {
    const tokens = await prisma.chipClaimToken.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        activationCode: true,
        activationCodeHash: true,
        activationCodeLast4: true,
      },
    });

    if (tokens.length === 0) break;
    cursor = tokens.at(-1)?.id;
    inspected += tokens.length;

    for (const token of tokens) {
      if (!activationCodeNeedsBackfill(token)) continue;
      pending += 1;
      if (!shouldApply) continue;

      const rawCode = revealActivationCode(token.activationCode);
      await prisma.chipClaimToken.update({
        where: { id: token.id },
        data: protectActivationCode(rawCode),
      });
      updated += 1;
    }
  }

  console.info(JSON.stringify({ mode: shouldApply ? "apply" : "dry-run", inspected, pending, updated }));
  if (!shouldApply && pending > 0) {
    console.info("Dry run only. Re-run with --apply to encrypt pending activation codes.");
  }
}

main()
  .catch((error) => {
    console.error("Activation-code backfill failed:", error instanceof Error ? error.message : "unknown_error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
