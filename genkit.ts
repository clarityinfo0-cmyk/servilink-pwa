import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Instancia central de Genkit para ServiLink Pro.
 * Configurada exclusivamente con el modelo gemini-1.5-flash-latest de AI Studio.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
