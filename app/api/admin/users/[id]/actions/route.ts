import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ACCOUNT_TYPES, USER_ROLES, ORGANIZATION_TYPES, BUSINESS_RULES } from "@/domains/shared/constants";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

// Check if the current session is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) return false;
  const role = session.user.role;
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPERADMIN;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  
  const session = await getServerSession(authOptions);
  const adminId = (session?.user as any)?.id;

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { action, data } = body;

  try {
    switch (action) {
      case "reset-password": {
        const { password } = data;
        if (!password) {
          return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash },
        });

        await (prisma as any).appNotification.create({
          data: {
            userId,
            title: "Seguridad Actualizada",
            message: "Un administrador ha restablecido tu contraseña.",
            type: "warning"
          }
        });
        
        return NextResponse.json({ message: "Contraseña actualizada exitosamente" });
      }

      case "convert-to-org": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: true, profile: true },
        });

        if (!user || !user.accountId) {
          return NextResponse.json({ error: "Usuario o cuenta no encontrada" }, { status: 404 });
        }

        await prisma.account.update({
          where: { id: user.accountId },
          data: { 
            accountType: ACCOUNT_TYPES.COMPANY,
            accountName: data.legalName || `${user.profile?.firstName} ${user.profile?.lastName} Org`
          },
        });

        // 2. Create Organization record
        const organization = await prisma.organization.create({
          data: {
            accountId: user.accountId,
            legalName: data.legalName || `${user.profile?.firstName} ${user.profile?.lastName} Corp`,
            displayName: data.displayName || data.legalName || `${user.profile?.firstName} Corp`,
            organizationType: ORGANIZATION_TYPES.COMPANY,
            status: "active",
            contactEmail: user.email,
            contactPhone: user.phone,
          },
        });

        await (prisma as any).appNotification.create({
          data: {
            userId,
            title: "Cuenta Corporativa Activada",
            message: `Tu cuenta ha sido convertida a ${data.legalName || 'cuenta corporativa'}. Ahora tienes acceso al módulo de organizaciones.`,
            type: "success"
          }
        });

        return NextResponse.json({ 
          message: "Cuenta convertida a corporativa exitosamente", 
          organization 
        });
      }

      case "update-plan": {
        const { packageId, maxChips, accountType } = data;
        
        const user = await prisma.user.findUnique({ 
          where: { id: userId },
          include: { account: true }
        });
        if (!user || !user.accountId) return NextResponse.json({ error: "Usuario sin cuenta" }, { status: 404 });

        // 1. Try to find the package in the DB first (Real CUIDs)
        let dbPackage = null;
        if (packageId) {
          dbPackage = await prisma.package.findUnique({
            where: { id: packageId }
          });

          if (!dbPackage || !dbPackage.isActive) {
            return NextResponse.json({ error: "Package inválido o inactivo" }, { status: 400 });
          }

          if (![ACCOUNT_TYPES.PERSONAL, ACCOUNT_TYPES.COMPANY].includes(dbPackage.accountType as "personal" | "company")) {
            return NextResponse.json({ error: "Package con accountType inválido" }, { status: 400 });
          }
        }

        // 2. Map values — ACUMULATIVO: si el usuario ya tiene chips de un plan previo,
        // el nuevo plan SUMA sus chips al total (no reemplaza).
        // Si se envía maxChips explícito (override manual), se usa directamente.
        // CUMULATIVE SALES PACK LOGIC: Selecting a package ADDS chips to the current total.
        const currentMaxChips = user.account?.maxChipsAllocated ?? 0;
        const currentMaxProfiles = user.account?.maxProfilesAllocated ?? 1;
        
        const newPlanChips = dbPackage ? dbPackage.maxChips : (maxChips !== undefined ? parseInt(maxChips) : 1);
        const newPlanProfiles = dbPackage ? dbPackage.maxProfiles : (maxChips !== undefined ? parseInt(maxChips) : 1);

        let finalMaxChips: number;
        let finalMaxProfiles: number;

        if (maxChips !== undefined && !dbPackage) {
          // Admin overriding manually — use the explicit number as total
          finalMaxChips = parseInt(maxChips);
          finalMaxProfiles = parseInt(maxChips); // Maintain 1:1 for manual override
        } else {
          // Cumulative logic: current + new pack
          finalMaxChips = currentMaxChips + newPlanChips;
          finalMaxProfiles = currentMaxProfiles + newPlanProfiles;
        }
        const finalPackageId = dbPackage ? dbPackage.id : null;

        const finalAccountType = dbPackage?.accountType || (
          accountType === ACCOUNT_TYPES.COMPANY ? ACCOUNT_TYPES.COMPANY : ACCOUNT_TYPES.PERSONAL
        );

        await prisma.account.update({
          where: { id: user.accountId },
          data: {
            packageId: finalPackageId,
            accountType: finalAccountType,
            maxChipsAllocated: finalMaxChips,
            maxProfilesAllocated: finalMaxProfiles,
          },
        });

        const isB2B = finalAccountType === ACCOUNT_TYPES.COMPANY || 
                      dbPackage?.allowsOrganizationModule;

        if (isB2B) {
          const existingOrg = await prisma.organization.findFirst({
            where: { accountId: user.accountId }
          });

          if (!existingOrg) {
             const userProfile = await prisma.profile.findUnique({ where: { userId: user.id } });
              await prisma.organization.create({
                data: {
                  accountId: user.accountId,
                  legalName: `${userProfile?.firstName || 'Org'} ${userProfile?.lastName || ''} Corp`,
                  displayName: `${userProfile?.firstName || 'Member'} Corp`,
                  organizationType: ORGANIZATION_TYPES.COMPANY,
                  status: "active",
                  contactEmail: user.email,
                }
              });
          }
        }

        // Log the update in Audit
        await prisma.auditLog.create({
          data: {
            actorUserId: adminId,
            entityType: "account",
            entityId: user.accountId,
            action: "upgrade_package",
            newValuesJson: JSON.stringify({
              packageId: finalPackageId,
              maxChips: finalMaxChips
            })
          }
        });

        await AccountStateService.invalidateCache(userId);

        await (prisma as any).appNotification.create({
          data: {
            userId,
            title: "Plan de Protección Actualizado",
            message: `Tu plan ha sido actualizado a ${dbPackage?.name || finalAccountType}. Nueva capacidad: ${finalMaxChips} chips.`,
            type: "success"
          }
        });

        return NextResponse.json({ 
          message: `Combo actualizado. Total chips asignados: ${finalMaxChips} (acumulativo).`,
          newTotal: finalMaxChips,
          previousTotal: currentMaxChips,
          addedByCombo: newPlanChips,
        });
      }

      case "add-chips": {
        // Admin manually adds individual chips ($25/chip) to a user's account
        const { quantity } = data;
        const qty = parseInt(quantity);

        if (!qty || qty < 1 || qty > 200) {
          return NextResponse.json({ error: "Cantidad inválida. Entre 1 y 200 chips." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: true },
        });
        if (!user?.accountId) return NextResponse.json({ error: "Usuario sin cuenta" }, { status: 404 });

        const updated = await prisma.account.update({
          where: { id: user.accountId },
          data: { maxChipsAllocated: { increment: qty } },
        });

        const totalCost = qty * BUSINESS_RULES.EXTRA_CHIP_PRICE;

        // Log the order
        await prisma.order.create({
          data: {
            userId,
            amount: totalCost,
            currency: "USD",
            paymentStatus: "completed",
            provider: "admin",
            providerReference: `admin-chips-${qty}-${Date.now()}`,
          },
        });

        await (prisma as any).appNotification.create({
          data: {
            userId,
            title: "Chips Adicionales Añadidos",
            message: `Se han añadido ${qty} chip(s) a tu cuenta. Nueva capacidad total: ${updated.maxChipsAllocated}.`,
            type: "success"
          }
        });

        return NextResponse.json({
          message: `${qty} chip(s) adicional(es) añadido(s). Nueva capacidad total: ${updated.maxChipsAllocated}. Costo: $${totalCost} USD.`,
          chipsAdded: qty,
          newLimit: updated.maxChipsAllocated,
          totalCost,
        });
      }

      case "reset-chips-to-plan": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: { include: { package: true } } },
        });
        if (!user?.accountId || !user.account) return NextResponse.json({ error: "Usuario sin cuenta" }, { status: 404 });

        const pkg = user.account.package;
        // If there's a package, fallback to its literal maxChips, if not, literal 1
        const baseChips = pkg ? pkg.maxChips : 1;

        await prisma.account.update({
          where: { id: user.accountId },
          data: { maxChipsAllocated: baseChips },
        });

        await AccountStateService.invalidateCache(userId);

        return NextResponse.json({ message: "Límite de chips restablecido al plan original." });
      }

      case "add-member": {
        const { email, password, role, firstName, lastName, phone, bloodType } = data;
        const targetOrgId = userId; // In this case 'userId' was used as orgId in the UI call

        const org = await prisma.organization.findUnique({
          where: { id: targetOrgId },
        });

        if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

        const passwordHash = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              email,
              passwordHash,
              phone: phone || null,
              role: role || "user",
              status: "active",
              accountId: org.accountId,
              profile: {
                create: {
                  accountId: org.accountId,
                  firstName: firstName || "Nuevo",
                  lastName: lastName || "Miembro",
                  bloodType: bloodType || "O+",
                },
              },
            },
            include: { profile: true }
          });

          // CRITICAL: Link to organization
          await tx.organizationMember.create({
            data: {
              organizationId: org.id,
              profileId: u.profile!.id,
              memberStatus: "active"
            }
          });

          return u;
        });

        return NextResponse.json({ 
          message: "Miembro añadido y vinculado exitosamente", 
          user: { id: newUser.id, email: newUser.email } 
        });
      }

      case "emergency-reset": {
        const { capacity } = data;
        const finalCapacity = parseInt(capacity) >= 0 ? parseInt(capacity) : 0;

        const target = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: true, profile: true },
        });

        if (!target || !target.accountId) {
          return NextResponse.json({ error: "Usuario o cuenta no encontrada" }, { status: 404 });
        }

        const accountId = target.accountId;

        await prisma.$transaction(async (tx) => {
          // 1. Unassign all Chips (Back to inventory)
          // We do this to ensure hardware is freed up when capacity changes or for a "clean" hardware state
          await tx.chip.updateMany({
            where: { accountId: accountId },
            data: { 
              assignedProfileId: null, 
              ownerUserId: null, 
              status: "inventory",
              chipAlias: null 
            },
          });

          // 2. Adjust Account state
          // We NO LONGER delete profiles or contacts. We only manage capacity and plan.
          await tx.account.update({
            where: { id: accountId },
            data: {
              accountType: ACCOUNT_TYPES.PERSONAL,
              maxChipsAllocated: finalCapacity,
              maxProfilesAllocated: finalCapacity,
              // If capacity is 0, account becomes inactive.
              status: finalCapacity === 0 ? "inactive" : "active",
              packageId: null
            }
          });

          // 3. Log the administrative adjustment
          await tx.auditLog.create({
            data: {
              actorUserId: adminId,
              entityType: "account",
              entityId: accountId,
              action: "account_governance_adjustment",
              newValuesJson: JSON.stringify({ 
                capacity: finalCapacity,
                status: finalCapacity === 0 ? "inactive" : "active"
              })
            }
          });
        });

        await AccountStateService.invalidateCache(userId);

        await (prisma as any).appNotification.create({
          data: {
            userId,
            title: "Ajuste de Cuenta Aplicado",
            message: `Se ha realizado un ajuste administrativo en tu cuenta. Capacidad actual: ${finalCapacity} chips.`,
            type: "warning"
          }
        });

        return NextResponse.json({ 
          message: `Ajuste de gobernanza completado. Capacidad: ${finalCapacity}. Estado: ${finalCapacity === 0 ? 'Inactivo' : 'Activo'}. Los perfiles fueron preservados.` 
        });
      }

      case "delete-user": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { account: true, profile: true }
        });
        
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        
        await prisma.$transaction(async (tx) => {
          // 1. Unassign chips and return to inventory
          if (user.accountId) {
            await tx.chip.updateMany({
              where: { OR: [{ ownerUserId: userId }, { accountId: user.accountId }] },
              data: { 
                ownerUserId: null, 
                accountId: null, 
                assignedProfileId: null, 
                status: "inventory",
                chipAlias: null 
              }
            });
          }

          // 2. Delete Notifications, Consents, ResetTokens
          await tx.appNotification.deleteMany({ where: { userId } });
          await tx.consent.deleteMany({ where: { userId } });
          await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
          
          // 3. Delete Scan Events related to this user's account or profiles
          const profiles = await tx.profile.findMany({ 
            where: { 
              OR: [
                { userId }, 
                user.accountId ? { accountId: user.accountId } : {}
              ].filter(Boolean) as any
            } 
          });
          const profileIds = profiles.map(p => p.id);
          
          if (profileIds.length > 0) {
            await tx.scanEvent.deleteMany({ where: { profileId: { in: profileIds } } });
            await tx.profileContact.deleteMany({ where: { profileId: { in: profileIds } } });
            await tx.organizationMember.deleteMany({ where: { profileId: { in: profileIds } } });
            await tx.profile.deleteMany({ where: { id: { in: profileIds } } });
          }

          // 4. Delete Contacts & Orders
          await tx.contact.deleteMany({ where: { userId } });
          await tx.order.deleteMany({ where: { userId } });

          // 5. Delete the User
          await tx.user.delete({ where: { id: userId } });

          // 6. Delete the Account (if orphaned)
          if (user.accountId) {
             const remainingUsers = await tx.user.count({ where: { accountId: user.accountId } });
             if (remainingUsers === 0) {
                await tx.organization.deleteMany({ where: { accountId: user.accountId } });
                await tx.account.delete({ where: { id: user.accountId } });
             }
          }

          // 7. Audit Log
          await tx.auditLog.create({
            data: {
              actorUserId: adminId || "system",
              entityType: "user",
              entityId: userId,
              action: "definitive_deletion",
              newValuesJson: JSON.stringify({ email: user.email, deletedAt: new Date() })
            }
          });
        });

        // Invalidate cache
        await AccountStateService.invalidateCache(userId);

        return NextResponse.json({ message: "Usuario y todos sus datos vinculados eliminados definitivamente. El hardware ha regresado a inventario." });
      }

      default:
        return NextResponse.json({ error: "Acción administrativa no reconocida" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin Action Error:", error);
    return NextResponse.json({ 
      error: error.message || "Error interno al procesar la acción administrativa" 
    }, { status: 500 });
  }
}
