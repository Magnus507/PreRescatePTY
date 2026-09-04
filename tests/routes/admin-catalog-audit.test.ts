import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  transaction: vi.fn(),
  productFindExternal: vi.fn(),
  finishedGoodFind: vi.fn(),
  productFind: vi.fn(),
  productCreate: vi.fn(),
  productUpdate: vi.fn(),
  productDelete: vi.fn(),
  packageFind: vi.fn(),
  packageCreate: vi.fn(),
  packageUpdate: vi.fn(),
  mappingFind: vi.fn(),
  mappingUpsert: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findUnique: mocks.productFindExternal },
    operationFinishedGood: { findUnique: mocks.finishedGoodFind },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/operations/inventory-stock", () => ({ loadInventoryStockRows: vi.fn() }));

import { POST as createProduct } from "@/app/api/admin/products/route";
import { PATCH as updateProduct, DELETE as deleteProduct } from "@/app/api/admin/products/[id]/route";
import { POST as createPackage, PATCH as updatePackage } from "@/app/api/admin/packages/route";
import { PATCH as updateMapping } from "@/app/api/admin/products/[id]/operational-mapping/route";

const product = {
  id: "product-1",
  name: "Brazalete",
  description: "Dispositivo",
  price: 25,
  category: "general",
  stock: 10,
  image: null,
  isActive: true,
  productType: "brazalete",
  estimatedProductionTime: null,
  requiresPersonalization: false,
};
const pkg = {
  id: "package-1",
  name: "Personal",
  slug: "personal",
  accountType: "personal",
  isActive: true,
  maxChips: 1,
  maxProfiles: 1,
  price: 10,
};

function request(path: string, method: string, body: unknown) {
  return new NextRequest(`https://example.test${path}`, {
    method,
    headers: { "x-vercel-id": "iad1::audit-catalog" },
    body: JSON.stringify(body),
  });
}

describe("admin catalog mutation audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "admin-account" } },
    });
    mocks.productFindExternal.mockResolvedValue({ id: product.id, name: product.name });
    mocks.productFind.mockResolvedValue(product);
    mocks.productCreate.mockResolvedValue(product);
    mocks.productUpdate.mockResolvedValue({ ...product, price: 30 });
    mocks.productDelete.mockResolvedValue(product);
    mocks.packageFind.mockResolvedValue(pkg);
    mocks.packageCreate.mockResolvedValue(pkg);
    mocks.packageUpdate.mockResolvedValue({ ...pkg, maxChips: 2 });
    mocks.mappingFind.mockResolvedValue(null);
    mocks.mappingUpsert.mockResolvedValue({
      id: "mapping-1",
      productId: product.id,
      deviceType: "personal",
      storeSection: "personal_devices",
      purchaseFlow: "direct_purchase",
      activationFlow: "personal_profile",
      isPublished: true,
    });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      product: {
        findUnique: mocks.productFind,
        create: mocks.productCreate,
        update: mocks.productUpdate,
        delete: mocks.productDelete,
      },
      package: {
        findUnique: mocks.packageFind,
        create: mocks.packageCreate,
        update: mocks.packageUpdate,
      },
      productOperationalMapping: {
        findUnique: mocks.mappingFind,
        upsert: mocks.mappingUpsert,
      },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("creates products with audit evidence in the same transaction", async () => {
    const response = await createProduct(request("/api/admin/products", "POST", {
      name: product.name,
      description: product.description,
      price: "25",
      stock: "10",
    }));

    expect(response.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "product_created", entityId: product.id }),
    });
  });

  it("updates and deletes products with before/after evidence", async () => {
    const updateResponse = await updateProduct(
      request(`/api/admin/products/${product.id}`, "PATCH", { price: "30" }),
      { params: Promise.resolve({ id: product.id }) },
    );
    expect(updateResponse.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "product_updated", oldValuesJson: expect.any(String), newValuesJson: expect.any(String) }),
    });

    const deleteResponse = await deleteProduct(
      request(`/api/admin/products/${product.id}`, "DELETE", {}),
      { params: Promise.resolve({ id: product.id }) },
    );
    expect(deleteResponse.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "product_deleted", entityId: product.id }),
    });
  });

  it("does not report a successful product mutation when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await updateProduct(
      request(`/api/admin/products/${product.id}`, "PATCH", { price: "30" }),
      { params: Promise.resolve({ id: product.id }) },
    );
    expect(response.status).toBe(500);
  });

  it("creates and updates packages with audit evidence", async () => {
    const createResponse = await createPackage(request("/api/admin/packages", "POST", {
      name: "Personal",
      maxChips: 1,
      price: 10,
    }));
    expect(createResponse.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "package_created", entityId: pkg.id }),
    });

    const updateResponse = await updatePackage(request("/api/admin/packages", "PATCH", {
      id: pkg.id,
      maxChips: 2,
    }));
    expect(updateResponse.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "package_updated", oldValuesJson: expect.any(String), newValuesJson: expect.any(String) }),
    });
  });

  it("updates operational mapping and audit evidence atomically", async () => {
    const response = await updateMapping(
      request(`/api/admin/products/${product.id}/operational-mapping`, "PATCH", {
        deviceType: "personal",
        storeSection: "personal_devices",
        purchaseFlow: "direct_purchase",
        activationFlow: "personal_profile",
        isPublished: true,
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "product_operational_mapping_updated",
        entityId: product.id,
        requestId: "iad1::audit-catalog",
      }),
    });
  });
});
