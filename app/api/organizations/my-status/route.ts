import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationMembers: {
            include: {
              organization: {
                select: {
                  id: true,
                  legalName: true,
                  displayName: true,
                  companyCode: true,
                  status: true,
                },
              },
              corporateProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileType: true,
                  bloodType: true,
                  phone: true,
                },
              },
              corporateOrderItems: {
                select: {
                  id: true,
                  fulfillmentStatus: true,
                  activatedAt: true,
                  product: { select: { id: true, name: true, productType: true } },
                  chip: { select: { id: true, shortCode: true, status: true, serialPublic: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let requests = user.profile?.organizationMembers || [];

  // Auto-repair: detect corporate members with missing corporateProfile
  if (user.accountId && requests.length > 0) {
    const repairedRequests = await Promise.all(
      requests.map(async (member) => {
        if (!member.corporateProfile) {
          // Check if this member is in an active/visible state that should have a corporate profile
          const activeStatuses = ["paid_active", "approved_unpaid"];
          if (activeStatuses.includes(member.corporateStatus)) {
            try {
              // Create a new corporate profile from personal profile data
              const personalProfile = user.profile;
              const newCorpProfile = await prisma.profile.create({
                data: {
                  accountId: user.accountId!,
                  profileType: "corporate",
                  firstName: personalProfile?.firstName || "Colaborador",
                  lastName: personalProfile?.lastName || "Empresarial",
                  bloodType: "Pendiente",
                  phone: personalProfile?.phone || null,
                  // No copy medical sensitive fields
                  // No set userId — corporate profiles don't use userId
                },
              });

              // Update OrganizationMember to link the new corporate profile
              await prisma.organizationMember.update({
                where: { id: member.id },
                data: { corporateProfileId: newCorpProfile.id },
              });

              // Return updated member with the new corporate profile
              return {
                ...member,
                corporateProfile: {
                  id: newCorpProfile.id,
                  firstName: newCorpProfile.firstName,
                  lastName: newCorpProfile.lastName,
                  profileType: newCorpProfile.profileType,
                  bloodType: newCorpProfile.bloodType,
                  phone: newCorpProfile.phone,
                },
              };
            } catch (repairErr) {
              console.error("[my-status] Auto-repair failed for member", member.id, repairErr);
              // Return member as-is with corporateProfileMissing flag
              return {
                ...member,
                corporateProfileMissing: true,
              };
            }
          }
        }
        return member;
      })
    );
    requests = repairedRequests as any;
  }

  return NextResponse.json({
    hasProfile: Boolean(user.profile),
    profile: user.profile,
    requests,
  });
}