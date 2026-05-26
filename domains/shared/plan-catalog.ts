/**
 * @deprecated Package is the single source of truth for plan data.
 * Use getPublicPackages() on the server or GET /api/public/packages from clients.
 */
export { getPublicPackages } from "./repositories/package.repository";

