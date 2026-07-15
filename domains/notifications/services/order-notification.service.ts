import { EmailService } from "@/domains/shared/services/email.service";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { logger } from "@/lib/logger";
import { MoneyInput, serializeMoney } from "@/lib/money";

type NotificationOrderItem = {
  quantity: number;
  productType: string;
};

type NotificationOrder = {
  customerEmail?: string | null;
  customerName?: string | null;
  orderNumber: string | number;
  amount: MoneyInput;
  items?: NotificationOrderItem[];
  shippingCity?: string | null;
  shippingAddress?: string | null;
};

export class OrderNotificationService {
  static async notifyPaymentValidated(order: NotificationOrder) {
    if (!order.customerEmail) return;

    try {
      const fromEmail = await ConfigRepository.get("sender_email", "soporte@prerescatepty.com");
      
      const subject = `Pago Validado - Orden #${order.orderNumber}`;
      
      const itemsHtml = (order.items ?? [])
        .map((item) => `<li>${item.quantity}x ${item.productType}</li>`)
        .join("");

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">¡Tu pago ha sido validado!</h2>
          <p>Hola <strong>${order.customerName || 'Cliente'}</strong>,</p>
          <p>Hemos confirmado tu pago para la orden <strong>#${order.orderNumber}</strong>. Tu pedido está siendo procesado por nuestro equipo logístico.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px;">Resumen del Pedido</h3>
            <ul style="padding-left: 20px; font-size: 14px;">
              ${itemsHtml}
            </ul>
            <p style="font-weight: bold; margin-bottom: 0;">Total Pago: $${serializeMoney(order.amount)}</p>
          </div>

          <p>Ya puedes ver tus códigos de activación (si aplica) en tu tablero de pedidos:</p>
          <a href="https://www.prerescatepty.com/dashboard/pedidos" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Ir a mis pedidos</a>
          
          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #6b7280;">Gracias por confiar en PreRescate PTY.<br/>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      `;

      await EmailService.send(order.customerEmail, subject, html, fromEmail);
    } catch (error) {
      logger.error("[OrderNotificationService] Error sending payment validation email:", error);
    }
  }

  static async notifyOrderShipped(order: NotificationOrder) {
    if (!order.customerEmail) return;

    try {
      const fromEmail = await ConfigRepository.get("sender_email", "soporte@prerescatepty.com");
      
      const subject = `Tu pedido está en camino - Orden #${order.orderNumber}`;
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">¡Tu pedido ha sido enviado! 🚚</h2>
          <p>Hola <strong>${order.customerName || 'Cliente'}</strong>,</p>
          <p>Excelentes noticias: tu paquete ya salió de nuestras oficinas y va en camino a la dirección indicada.</p>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p style="margin: 0; font-size: 14px;"><strong>Destino:</strong> ${order.shippingCity || 'Panamá'}, ${order.shippingAddress || 'Dirección de envío'}</p>
          </div>

          <p>Recuerda que si tu paquete incluye chips físicos, podrás activarlos usando los códigos que aparecen en tu cuenta.</p>
          
          <a href="https://www.prerescatepty.com/dashboard/pedidos" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Seguir mi pedido</a>
          
          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #6b7280;">Saludos,<br/>El Equipo de Logística de PreRescate PTY</p>
        </div>
      `;

      await EmailService.send(order.customerEmail, subject, html, fromEmail);
    } catch (error) {
      logger.error("[OrderNotificationService] Error sending shipment email:", error);
    }
  }
}
