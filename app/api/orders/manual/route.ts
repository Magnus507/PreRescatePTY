import { NextResponse } from "next/server";

/**
 * Legacy package checkout.
 *
 * Packages are retained only as historical database records. New purchases must
 * use the product/device checkout at POST /api/orders so each physical unit is
 * represented explicitly and can grant its own annual-access credit.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "El checkout por paquetes fue retirado. Compra dispositivos individuales desde la tienda.",
      code: "PACKAGE_CHECKOUT_RETIRED",
    },
    { status: 410 }
  );
}
