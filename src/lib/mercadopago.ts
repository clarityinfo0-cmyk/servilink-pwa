
import { MercadoPagoConfig, Preference } from 'mercadopago';

/**
 * Configuración de Mercado Pago para ServiLink.
 * Utiliza las credenciales de entorno para mayor seguridad.
 */
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-APP-TOKEN-PLACEHOLDER',
});

export const preference = new Preference(mpClient);
