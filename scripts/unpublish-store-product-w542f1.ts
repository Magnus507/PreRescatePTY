import { PrismaClient } from "@prisma/client";
import { extractOperationsProductCode } from "../lib/operations/sync-operations-product-to-store";

const prisma = new PrismaClient();
const CONFIRMATION = "UNPUBLISH_PHANTOM_ACCESSORY_W542F1";

function hasFlag(argv: string[], flag: string) {
  return argv.includes(flag);
}

function getConfirmValue(argv: string[]) {
  const index = argv.indexOf("--confirm");
  return index >= 0 ? argv[index + 1] || "" : "";
}

function stripOperationsMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = !hasFlag(argv, "--execute") || hasFlag(argv, "--dry-run");
  const confirm = getConfirmValue(argv);

  if (!dryRun && confirm !== CONFIRMATION) {
    throw new Error(`Run with --execute --confirm ${CONFIRMATION} to apply changes.`);
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: "Chip Empresarial" },
        { productType: "Chip Empresarial" },
        { description: { contains: "[operationsProductCode:Chip Empresarial]" } },
      ],
    },
    select: { id: true, name: true, description: true, productType: true, isActive: true, stock: true, price: true },
  });

  const target = products.find((product) => extractOperationsProductCode(product) === "Chip Empresarial") || null;

  console.log("=== W5.42F.1 Unpublish Phantom Accessory ===");
  console.log(`dryRun: ${dryRun}`);
  console.log(`matchesFound: ${products.length}`);
  console.log(`targetFound: ${Boolean(target)}`);
  if (target) {
    console.log(`targetId: ${target.id}`);
    console.log(`targetName: ${target.name}`);
    console.log(`targetVisible: ${target.isActive}`);
    console.log(`targetDescription: ${stripOperationsMarker(target.description) || ""}`);
  }

  if (dryRun) {
    console.log("Dry run activo. No se realizaron cambios.");
    return;
  }

  if (!target) {
    console.log("No hay producto fantasma para despublicar.");
    return;
  }

  await prisma.product.update({
    where: { id: target.id },
    data: {
      isActive: false,
      description: stripOperationsMarker(target.description) || null,
    },
  });

  console.log("Producto despublicado.");
}

main()
  .catch((error) => {
    console.error("W5.42F.1 unpublish failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
