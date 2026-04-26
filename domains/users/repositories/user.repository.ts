import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class UserRepository {
  /**
   * Find personal users with pagination and search, excluding admins.
   */
  static async findPersonalUsers(options: { 
    page: number; 
    limit: number; 
    search?: string;
  }) {
    const { page, limit, search } = options;

    // 2. Build base filter — exclude admin users directly
    const where: Prisma.UserWhereInput = {
      AND: [
        { isAdmin: false },
        {
          account: {
            accountType: { notIn: ["company", "organization", "school"] },
            organizations: { none: {} }
          }
        }
      ]
    };

    // 3. Search filter
    if (search?.trim()) {
      const sanitizedSearch = search.trim();
      if (!where.AND) where.AND = [];
      const andArray = where.AND as Prisma.UserWhereInput[];
      andArray.push({
        OR: [
          { email: { contains: sanitizedSearch, mode: "insensitive" } },
          { phone: { contains: sanitizedSearch } },
        ]
      });
    }

    // 4. Execute queries
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          accountId: true,
          account: {
            select: {
              id: true,
              packageId: true,
              maxChipsAllocated: true,
              accountType: true,
              package: { select: { name: true } },
            }
          },
          _count: { select: { chips: true } },
          // We limit chips returned for performance in listing
          chips: {
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              shortCode: true,
              status: true,
              activatedAt: true,
            }
          },
          profile: {
            select: {
              firstName: true,
              lastName: true,
              bloodType: true,
              nationalId: true,
            }
          },
          consent: {
            select: { revokedAt: true }
          }
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Update user status.
   */
  static async updateStatus(id: string, status: "active" | "suspended") {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });
  }
}
