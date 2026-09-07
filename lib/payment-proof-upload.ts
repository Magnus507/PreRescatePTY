const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadPaymentProof(orderId: string, file: File, reference?: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Solo se permiten comprobantes JPG, PNG o WebP.");
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("El comprobante debe pesar como máximo 5MB.");
  const signedRes = await fetch(`/api/orders/${orderId}/payment-proof/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: file.type, size: file.size }),
  });
  const signedData = await signedRes.json().catch(() => ({}));
  if (!signedRes.ok || !signedData?.path || !signedData?.signedUrl) {
    throw new Error(signedData?.error || "No se pudo preparar la carga del comprobante");
  }

  // Upload raw bytes instead of multipart/FormData. This is more reliable
  // across Safari and avoids Storage receiving an empty multipart body.
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size || bytes.byteLength <= 0) {
    throw new Error("No pudimos leer el contenido de la imagen. Selecciónala nuevamente.");
  }

  const uploadRes = await fetch(signedData.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const uploadBody = await uploadRes.text().catch(() => "");
    let uploadMessage = "No se pudo subir el comprobante";
    if (uploadBody) {
      try {
        const parsed = JSON.parse(uploadBody) as { message?: string; error?: string };
        uploadMessage = parsed.message || parsed.error || uploadMessage;
      } catch {
        uploadMessage = uploadBody.slice(0, 180) || uploadMessage;
      }
    }
    if (/no content provided/i.test(uploadMessage)) {
      uploadMessage = "El almacenamiento no recibió los bytes de la imagen. Vuelve a seleccionarla e intenta nuevamente.";
    }
    throw new Error(uploadMessage);
  }

  const registerRes = await fetch(`/api/orders/${orderId}/payment-proof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentProofPath: signedData.path,
      manualPaymentReference: reference?.trim() || undefined,
    }),
  });
  const registerData = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok) {
    throw new Error(registerData?.error || "El archivo subió, pero no se pudo asociar al pedido");
  }

}
