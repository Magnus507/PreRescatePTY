"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Heart, Phone, AlertTriangle, Droplets, Pill, Activity, User, MessageCircle, Loader2 } from "lucide-react";

interface EmergencyProfile {
  displayName: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  additionalNotes: string;
  photoUrl: string | null;
  emergencyContacts: {
    fullName: string;
    relationship: string;
    phone: string;
  }[];
}

export default function EmergencyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shortCode = params.shortCode as string;
  const source = searchParams.get("source") || "qr";
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanTime] = useState(new Date().toLocaleString("es-PA", { timeZone: "America/Panama" }));

  useEffect(() => {
    async function load() {
      try {
        // Record scan event
        const scanBody: Record<string, unknown> = { sourceType: source };

        // Try to get geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              fetch(`/api/public/${shortCode}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...scanBody,
                  geoLat: pos.coords.latitude,
                  geoLng: pos.coords.longitude,
                  geoAccuracy: pos.coords.accuracy,
                }),
              });
            },
            () => {
              fetch(`/api/public/${shortCode}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scanBody),
              });
            },
            { timeout: 3000 }
          );
        } else {
          fetch(`/api/public/${shortCode}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanBody),
          });
        }

        // Fetch public profile
        const res = await fetch(`/api/public/${shortCode}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Perfil no disponible");
        } else {
          setProfile(data.profile);
        }
      } catch {
        setError("Error al cargar el perfil de emergencia");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [shortCode, source]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Cargando perfil de emergencia...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfil No Disponible</h1>
          <p className="text-gray-600">{error || "Este chip no tiene un perfil activo."}</p>
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-800 font-medium">🚨 En caso de emergencia, llame al 911</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Emergency Header */}
      <header className="bg-red-600 text-white py-4 px-4 emergency-pulse">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">PERFIL DE EMERGENCIA</h1>
              <p className="text-red-100 text-xs">PreRescate PTY — Panamá</p>
            </div>
          </div>
          <a
            href="tel:911"
            className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors shadow-lg"
          >
            <Phone className="h-4 w-4" /> 911
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Name */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Paciente</p>
              <h2 className="text-2xl font-bold text-gray-900">{profile.displayName}</h2>
            </div>
          </div>
        </div>

        {/* Blood Type - Prominent */}
        <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Droplets className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs text-red-600 uppercase tracking-wider font-medium">Tipo de Sangre</p>
              <p className="text-4xl font-black text-red-700">{profile.bloodType}</p>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-1">Alergias</p>
              <p className="text-lg font-semibold text-gray-900">{profile.allergies || "No reportadas"}</p>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {profile.chronicConditions && profile.chronicConditions !== "No reportadas" && (
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
            <div className="flex items-start gap-3">
              <Activity className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-700 uppercase tracking-wider font-medium mb-1">Condiciones Médicas</p>
                <p className="text-base font-semibold text-gray-900">{profile.chronicConditions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Medications */}
        {profile.medications && profile.medications !== "No reportados" && (
          <div className="bg-purple-50 rounded-2xl p-5 border border-purple-200">
            <div className="flex items-start gap-3">
              <Pill className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-purple-700 uppercase tracking-wider font-medium mb-1">Medicamentos</p>
                <p className="text-base font-semibold text-gray-900">{profile.medications}</p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
          <p className="text-xs text-green-700 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contactos de Emergencia
          </p>
          <div className="space-y-3">
            {profile.emergencyContacts.map((contact, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl p-4 border border-green-200">
                <div>
                  <p className="font-semibold text-gray-900">{contact.fullName}</p>
                  <p className="text-xs text-gray-500">{contact.relationship}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                  <a
                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan info */}
        <div className="text-center py-3">
          <p className="text-xs text-gray-400">Escaneo registrado: {scanTime}</p>
        </div>

        {/* Legal disclaimer */}
        <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            ⚠️ Esta información es proporcionada por el usuario y no reemplaza la atención médica profesional ni al 911.
            En caso de emergencia, llame al <strong>911</strong> inmediatamente.
            <br />
            <span className="text-gray-400 mt-1 block">
              PreRescate PTY — Sistema de Identificación de Emergencia — Panamá
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
