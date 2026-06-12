/**
 * Historical migration placeholder.
 *
 * The old AdminUser model has already been removed from the Prisma schema.
 * Keep this file so old commands fail gracefully instead of breaking
 * TypeScript checks by referencing prisma.adminUser.
 */
async function main() {
  console.log("Admin users are already stored in the unified User table.");
}

main().catch((error) => {
  console.error("Migration placeholder failed:", error);
  process.exit(1);
});
