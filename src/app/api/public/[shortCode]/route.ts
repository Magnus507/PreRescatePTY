import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    const chip = await prisma.chip.findUnique({
      where: { shortCode },
      include: {
        assignedProfile: {
          include: {
            emergencyContacts: {
              where: { active: true },
              orderBy: { priorityOrder: "asc" },
            },
          },
        },
      },
    });

    if (!chip || chip.status !== "activated" || !chip.assignedProfile) {
      return NextResponse.json(
        { error: "Perfil no disponible", status: "not_found" },
        { status: 404 }
      );
    }

    const profile = chip.assignedProfile;

    if (profile.profileVisibilityStatus !== "active") {
      return NextResponse.json(
        { error: "Perfil desactivado temporalmente", status: "hidden" },
        { status: 403 }
      );
    }

    // Build public-safe response (NO email, NO birthdate, NO internal IDs)
    const publicProfile = {
      displayName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName.charAt(0)}.`,
      bloodType: profile.bloodType,
      allergies: profile.allergies || "No reportadas",
      chronicConditions: profile.chronicConditions || "No reportadas",
      medications: profile.medications || "No reportados",
      additionalNotes: profile.additionalNotes || "",
      photoUrl: profile.photoUrl || null,
      emergencyContacts: profile.emergencyContacts.map((c) => ({
        fullName: c.fullName,
        relationship: c.relationship,
        phone: c.phone,
      })),
    };

    return NextResponse.json({ profile: publicProfile });
  } catch (error) {
    console.error("Public profile error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
