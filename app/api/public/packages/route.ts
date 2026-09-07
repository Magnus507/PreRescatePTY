import { NextResponse } from 'next/server';
import { getPublicPackages } from '@/domains/shared/repositories/package.repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const packages = await getPublicPackages();
    const publicPackages = packages.map((pkg) => {
      const { serviceDurationMonths, ...publicPackage } = pkg;
      void serviceDurationMonths;
      return publicPackage;
    });

    return NextResponse.json({ packages: publicPackages });
  } catch (error) {
    console.error('Error fetching public packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
