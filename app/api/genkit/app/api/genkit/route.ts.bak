import { startFlowServer } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';

// Importar los flujos para que se registren en el servidor de Genkit
import '@/ai/flows/ai-ticket-categorization';
import '@/ai/flows/ai-quote-analysis-flow';
import '@/ai/flows/ai-diagnostic-assistant-flow';

/**
 * Punto de entrada oficial de Genkit Runtime.
 * Permite la comunicación entre los flujos y la aplicación.
 */
export const { GET, POST } = startFlowServer(ai);
