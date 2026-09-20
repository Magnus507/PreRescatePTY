import { redirect } from "next/navigation";

export default function LegacyInventoryLotsPage() {
  redirect("/admin?tab=inventory");
}
