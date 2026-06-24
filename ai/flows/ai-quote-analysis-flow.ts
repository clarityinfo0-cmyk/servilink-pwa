
'use server';
/**
 * @fileOverview Flujo de IA para la Defensa del Cliente ServiLink.
 * Analiza la coherencia técnica, el precio justo y proporciona recomendaciones claras.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuoteAnalysisInputSchema = z.object({
  ticketTitle: z.string(),
  ticketDescription: z.string(),
  laborDescription: z.string(),
  laborCost: z.number(),
  materials: z.array(z.object({
    description: z.string(),
    cost: z.number(),
    quantity: z.number(),
    unit: z.string()
  })),
  totalEstimate: z.number()
});
export type QuoteAnalysisInput = z.infer<typeof QuoteAnalysisInputSchema>;

const QuoteAnalysisOutputSchema = z.object({
  analysis: z.string().describe("Análisis técnico detallado que explica la lógica del precio o las fallas en el plan de trabajo."),
  verdict: z.enum(['fair', 'questionable', 'overpriced', 'suspicious_low']).describe("Semáforo de confianza."),
  riskScore: z.number().min(0).max(100).describe("Puntaje de riesgo de calidad o fraude."),
  recommendation: z.string().describe("Instrucción clara al cliente: ¿Aceptar o esperar otra cotización?"),
  tips: z.array(z.string()).describe("Preguntas clave para el cliente."),
  summary: z.string().describe("Resumen ejecutivo del veredicto."),
  technicalCoherence: z.boolean().describe("¿La solución técnica coincide con el síntoma reportado?"),
});
export type QuoteAnalysisOutput = z.infer<typeof QuoteAnalysisOutputSchema>;

const analyzeQuotePrompt = ai.definePrompt({
  name: 'analyzeQuotePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: QuoteAnalysisInputSchema },
  output: { schema: QuoteAnalysisOutputSchema },
  prompt: `Eres el "Defensor del Cliente" de ServiLink. Tu misión es ser un experto en mantenimiento que protege al cliente de sobreprecios o engaños técnicos.
    
    CASO DEL CLIENTE:
    Título: {{{ticketTitle}}}
    Síntomas: {{{ticketDescription}}}
    
    PRESUPUESTO DEL TÉCNICO:
    Mano de obra: {{{laborDescription}}} ($ {{laborCost}})
    Materiales:
    {{#each materials}}
    - {{{description}}}: {{quantity}} {{unit}} x $ {{cost}}
    {{/each}}
    TOTAL FINAL: $ {{totalEstimate}}

    TU MISIÓN:
    1. EXPLICACIÓN LÓGICA: Explica al cliente POR QUÉ el presupuesto tiene sentido o por qué no. 
       - Si es lógico, menciona qué partes del síntoma se están atacando.
       - Si no es lógico, señala qué falta o qué está de más (ej. "Te cobran material que no se usa para este problema").
    2. RECOMENDACIÓN: Si el veredicto es 'overpriced' o 'questionable', dile al cliente explícitamente: "Te sugiero rechazar este presupuesto y esperar a que otro técnico cotice". 
       - Si el veredicto es 'fair', dile: "El presupuesto es honesto y técnico, puedes aceptarlo con confianza".
    3. COHERENCIA: ¿El trabajo descrito realmente soluciona la falla?
    4. VERDICTO: 
       - 'fair' (Verde): Mercado y técnica correctos.
       - 'questionable' (Amarillo): Caro pero posible, o faltan detalles.
       - 'overpriced' (Rojo): Abuso de precio.
       - 'suspicious_low' (Azul): Tan barato que seguro usará materiales de mala calidad o el trabajo será incompleto.`,
});

const analyzeQuoteFlow = ai.defineFlow(
  {
    name: 'analyzeQuoteFlow',
    inputSchema: QuoteAnalysisInputSchema,
    outputSchema: QuoteAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeQuotePrompt(input);
    if (!output) throw new Error('IA Error: No se pudo analizar el presupuesto.');
    return output!;
  }
);

export async function analyzeQuote(input: QuoteAnalysisInput): Promise<QuoteAnalysisOutput> {
  try {
    return await analyzeQuoteFlow(input);
  } catch (error: any) {
    console.error('Error en analyzeQuote Action:', error);
    return {
      analysis: 'Estamos experimentando una alta demanda en el servicio de auditoría IA.',
      verdict: 'questionable',
      riskScore: 50,
      recommendation: 'Pide al técnico un desglose más detallado antes de aceptar.',
      tips: ['Verifica el costo de los materiales en tiendas locales.', 'Pregunta si el trabajo tiene garantía escrita.'],
      summary: 'Análisis temporalmente limitado.',
      technicalCoherence: true
    };
  }
}
