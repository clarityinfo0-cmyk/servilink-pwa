'use server';
/**
 * @fileOverview Consultoría Técnica IA ServiLink.
 * Transforma descripciones comunes de clientes en reportes técnicos profesionales para especialistas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CategorizeTicketInputSchema = z.object({
  problemDescription: z.string().describe('La descripción del problema proporcionada por el cliente.'),
});
export type CategorizeTicketInput = z.infer<typeof CategorizeTicketInputSchema>;

const CategorizeTicketOutputSchema = z.object({
  status: z.enum(['needs_info', 'ready_to_assign']).describe('Indica si la IA necesita más datos.'),
  suggestedCategory: z.string().describe('Categoría sugerida.'),
  refinedDescription: z.string().describe('Versión técnica y profesional del reporte.'),
  technicalSeverity: z.enum(['low', 'medium', 'high', 'critical']).describe('Gravedad técnica calculada.'),
  adviceForClient: z.string().describe('Consejo de seguridad inmediato para el cliente.'),
});
export type CategorizeTicketOutput = z.infer<typeof CategorizeTicketOutputSchema>;

const categorizeTicketPrompt = ai.definePrompt({
  name: 'categorizeTicketPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: CategorizeTicketInputSchema },
  output: { schema: CategorizeTicketOutputSchema },
  prompt: `Eres el Director Técnico de Operaciones de ServiLink Pro. 
    Tu misión es recibir el reporte de un cliente (que no es experto) y convertirlo en una ORDEN DE TRABAJO PROFESIONAL para un especialista.
    
    INSTRUCCIONES:
    1. LENGUAJE: Español técnico y ejecutivo.
    2. TRADUCCIÓN TÉCNICA: Si el cliente dice "truena la caja de luz", tú escribes "Se detecta actividad de arco eléctrico en centro de carga principal".
    3. SEGURIDAD: Proporciona un consejo de seguridad crítico (ej. "Baje el interruptor principal inmediatamente").
    4. PRIORIDAD: Clasifica la gravedad técnica según los síntomas.
    
    Descripción del usuario: {{{problemDescription}}}`,
});

export async function categorizeTicket(input: CategorizeTicketInput): Promise<CategorizeTicketOutput> {
  try {
    const { output } = await categorizeTicketPrompt(input);
    if (!output) throw new Error('IA Error: No se pudo generar la consultoría.');
    return output!;
  } catch (error: any) {
    console.error('Error en categorizeTicket:', error);
    // Fallback robusto para que el técnico siempre vea algo profesional
    return {
      status: 'ready_to_assign',
      suggestedCategory: 'general',
      refinedDescription: `REPORTE TÉCNICO: ${input.problemDescription}. (Validación IA pendiente, proceda con inspección física).`,
      technicalSeverity: 'medium',
      adviceForClient: 'Mantenga el área despejada y espere al especialista para un diagnóstico seguro.',
    };
  }
}
