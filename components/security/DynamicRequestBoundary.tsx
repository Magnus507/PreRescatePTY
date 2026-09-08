import { headers } from "next/headers";

export default async function DynamicRequestBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading request headers keeps only this subtree dynamic so Next can apply
  // the per-request CSP nonce without forcing the marketing surface dynamic.
  await headers();
  return <>{children}</>;
}
