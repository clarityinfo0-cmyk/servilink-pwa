'use server';
/**
 * @fileOverview Flujo desactivado para cumplir con la regla de exclusividad para clientes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIDiagnosticAssistantInputSchema = z.object({
  problemDescription: z.string(),
});

const AIDiagnosticAssistantOutputSchema = z.object({
  message: z.string(),
});

/**
 * Este flujo ha sido desactivado ya que la IA en ServiLink es exclusiva para clientes.
 * Se ha eliminado runFlow para usar una Server Action estándar.
 */
export async function aiDiagnosticAssistant(input: any) {
  return {
    message: "Este servicio de IA es exclusivo para soporte al cliente."
  };
}
