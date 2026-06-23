import Image from "next/image";
import { prisma } from "@/lib/prisma";
import ClientCompanyCodeSection from "./client";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export default async function CorporatePublicPage({ params }: PageProps) {
  const { shortCode } = await params;

  const profile = await prisma.corporatePublicProfile.findUnique({
    where: { shortCode },
    include: {
      organization: {
        select: {
          companyCode: true,
        },
      },
    },
  });

  if (!profile || profile.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-lg font-semibold text-muted-foreground">Perfil empresarial no disponible</p>
      </div>
    );
  }

  const companyName =
    (profile.showDisplayName && profile.displayName) ||
    (profile.showLegalName && profile.legalName) ||
    "Empresa";

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto rounded-2xl border bg-white p-5 sm:p-7 space-y-5">
        {profile.showLogo && profile.logoUrl && (
          <div className="flex justify-center">
            <Image
              src={profile.logoUrl}
              alt="Logo empresarial"
              width={120}
              height={120}
              className="rounded-xl object-cover border"
            />
          </div>
        )}

        <section className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight">{companyName}</h1>
          {profile.showIndustry && profile.industry && (
            <p className="text-sm text-muted-foreground">{profile.industry}</p>
          )}
          {profile.showDescription && profile.description && <p className="text-sm">{profile.description}</p>}
          {profile.showSlogan && profile.slogan && (
            <p className="text-sm italic text-muted-foreground">“{profile.slogan}”</p>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {profile.showLegalName && profile.legalName && <p><strong>Razón social:</strong> {profile.legalName}</p>}
          {profile.showRuc && profile.ruc && <p><strong>RUC:</strong> {profile.ruc}</p>}
          {profile.showFoundedYear && profile.foundedYear && <p><strong>Fundación:</strong> {profile.foundedYear}</p>}
          {profile.showPhone && profile.phone && <p><strong>Teléfono:</strong> {profile.phone}</p>}
          {profile.showWhatsapp && profile.whatsapp && <p><strong>WhatsApp:</strong> {profile.whatsapp}</p>}
          {profile.showEmail && profile.email && <p><strong>Email:</strong> {profile.email}</p>}
          {profile.showAddress && profile.address && <p className="sm:col-span-2"><strong>Dirección:</strong> {profile.address}</p>}
          {profile.showBusinessHours && profile.businessHours && (
            <p className="sm:col-span-2"><strong>Horario:</strong> {profile.businessHours}</p>
          )}
        </section>

        <section className="flex flex-wrap gap-2">
          {profile.showWebsite && profile.website && (
            <a className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm" href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer">Sitio web</a>
          )}
          {profile.showMapUrl && profile.mapUrl && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.mapUrl)} target="_blank" rel="noopener noreferrer">Mapa</a>
          )}
          {profile.showInstagram && profile.instagram && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.instagram)} target="_blank" rel="noopener noreferrer">Instagram</a>
          )}
          {profile.showFacebook && profile.facebook && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.facebook)} target="_blank" rel="noopener noreferrer">Facebook</a>
          )}
          {profile.showLinkedin && profile.linkedin && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.linkedin)} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          )}
          {profile.showTiktok && profile.tiktok && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.tiktok)} target="_blank" rel="noopener noreferrer">TikTok</a>
          )}
          {profile.showXTwitter && profile.xTwitter && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.xTwitter)} target="_blank" rel="noopener noreferrer">X</a>
          )}
          {profile.showYoutube && profile.youtube && (
            <a className="px-3 py-2 rounded-lg border text-sm" href={normalizeUrl(profile.youtube)} target="_blank" rel="noopener noreferrer">YouTube</a>
          )}
        </section>

        {(profile.showMainServices || profile.showMainProducts || profile.showBranches) && (
          <section className="space-y-2 text-sm">
            {profile.showMainServices && profile.mainServices && <p><strong>Servicios:</strong> {profile.mainServices}</p>}
            {profile.showMainProducts && profile.mainProducts && <p><strong>Productos:</strong> {profile.mainProducts}</p>}
            {profile.showBranches && profile.branches && <p><strong>Sucursales:</strong> {profile.branches}</p>}
          </section>
        )}

        {(profile.showSecurityContactName || profile.showSecurityPhone || profile.showEmergencyProcedure || profile.showMeetingPoint || profile.showReceptionPhone || profile.showCorporateWhatsapp) && (
          <section className="rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-bold">Seguridad y emergencia</h2>
            {profile.showSecurityContactName && profile.securityContactName && <p><strong>Contacto:</strong> {profile.securityContactName}</p>}
            {profile.showSecurityPhone && profile.securityPhone && <p><strong>Tel. seguridad:</strong> {profile.securityPhone}</p>}
            {profile.showEmergencyProcedure && profile.emergencyProcedure && <p><strong>Procedimiento:</strong> {profile.emergencyProcedure}</p>}
            {profile.showMeetingPoint && profile.meetingPoint && <p><strong>Punto de encuentro:</strong> {profile.meetingPoint}</p>}
            {profile.showReceptionPhone && profile.receptionPhone && <p><strong>Recepción:</strong> {profile.receptionPhone}</p>}
            {profile.showCorporateWhatsapp && profile.corporateWhatsapp && <p><strong>WhatsApp corporativo:</strong> {profile.corporateWhatsapp}</p>}
          </section>
        )}

        {profile.showCompanyCode && profile.organization.companyCode && (
          <ClientCompanyCodeSection
            companyCode={profile.organization.companyCode}
            showCustomEmployeeMessage={profile.showCustomEmployeeMessage}
            customEmployeeMessage={profile.customEmployeeMessage}
          />
        )}
      </div>
    </main>
  );
}