import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id: string }).id;
    const state = await AccountStateService.getAccountState(userId);
    
    return NextResponse.json(state);
  } catch (error: any) {
    if (error.message === "User not found") {
      return NextResponse.json({ error: "Sesión inválida o usuario eliminado" }, { status: 401 });
    }
    console.error("Error fetching account state:", error);
    return NextResponse.json(
      { error: "Error al obtener el estado de la cuenta" },
      { status: 500 }
    );
  }
}
