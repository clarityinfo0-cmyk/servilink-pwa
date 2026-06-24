
'use server';

import { preference } from '@/lib/mercadopago';

/**
 * Crea una preferencia de pago en Mercado Pago para un presupuesto técnico.
 * Implementa la lógica de marketplace para split de pagos (simulado).
 */
export async function createServicePreference(ticketId: string, title: string, amount: number) {
  try {
    const body = {
      items: [
        {
          id: ticketId,
          title: `Servicio ServiLink: ${title}`,
          unit_price: amount,
          quantity: 1,
          currency_id: 'MXN',
        },
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/dashboard/tickets/${ticketId}?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/dashboard/tickets/${ticketId}?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/dashboard/tickets/${ticketId}?payment=pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/webhooks/mercadopago`,
      // En un entorno productivo, aquí se agregaría el marketplace_fee para el split
      // marketplace_fee: amount * 0.15, 
    };

    const response = await preference.create({ body });
    
    return {
      id: response.id,
      init_point: response.init_point,
    };
  } catch (error: any) {
    console.error('Error creando preferencia MP:', error);
    throw new Error('No pudimos generar el enlace de pago. Intenta más tarde.');
  }
}
