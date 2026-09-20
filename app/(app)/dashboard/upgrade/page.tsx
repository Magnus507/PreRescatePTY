import { redirect } from "next/navigation";

export default function LegacyUpgradePage() {
  redirect("/dashboard/tienda");
}
