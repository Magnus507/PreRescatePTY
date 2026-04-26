import { NextResponse } from "next/server";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";

export async function GET() {
  const configs = await ConfigRepository.getAll();
  
  // Only expose public settings (don't expose internal/sensitive settings if added later)
  const publicKeys = [
    "yappy_handle", 
    "yappy_qr_url", 
    "bank_name", 
    "bank_account_type", 
    "bank_account_number", 
    "bank_account_name"
  ];

  const publicConfigs = Object.keys(configs)
    .filter(key => publicKeys.includes(key))
    .reduce((obj, key) => {
      obj[key] = configs[key];
      return obj;
    }, {} as Record<string, string>);

  return NextResponse.json({ configs: publicConfigs });
}
