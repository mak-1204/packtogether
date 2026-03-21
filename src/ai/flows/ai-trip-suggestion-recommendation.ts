'use server';
/**
 * @fileOverview This flow provides an AI-powered trip recommendation based on group preferences and a list of suggestions.
 *
 * - aiTripSuggestionRecommendation - A function that handles the AI trip suggestion recommendation process.
 * - AiTripSuggestionRecommendationInput - The input type for the aiTripSuggestionRecommendation function.
 * - AiTripSuggestionRecommendationOutput - The return type for the aiTripSuggestionRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTripSuggestionRecommendationInputSchema = z.object({
  groupPreferences: z.string().describe('A detailed description of the group\'s travel preferences and constraints. This should include things like budget, preferred activities, desired atmosphere, travel dates, etc.'),
  suggestions: z.array(
    z.object({
      link: z.string().url().describe('A URL to the trip suggestion (e.g., a travel blog, booking site, or destination page).'),
      notes: z.string().describe('Any additional notes or details about this suggestion.'),
      addedBy: z.string().describe('The name of the person who added this suggestion.'),
    })
  ).describe('An array of trip suggestions, each with a link, notes, and who added it.'),
});
export type AiTripSuggestionRecommendationInput = z.infer<typeof AiTripSuggestionRecommendationInputSchema>;

const AiTripSuggestionRecommendationOutputSchema = z.object({
  recommendedSuggestionIndex: z.number().int().describe('The 0-based index of the suggestion from the input array that best matches the group\'s preferences.'),
  aiReason: z.string().describe('A clear and concise explanation from the AI detailing why the recommended suggestion was chosen, referencing the group preferences and specific aspects of the suggestion.'),
});
export type AiTripSuggestionRecommendationOutput = z.infer<typeof AiTripSuggestionRecommendationOutputSchema>;

export async function aiTripSuggestionRecommendation(input: AiTripSuggestionRecommendationInput): Promise<AiTripSuggestionRecommendationOutput> {
  return aiTripSuggestionRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTripSuggestionRecommendationPrompt',
  input: {schema: AiTripSuggestionRecommendationInputSchema},
  output: {schema: AiTripSuggestionRecommendationOutputSchema},
  prompt: `You are an expert trip planner, known for your ability to analyze group preferences and find the perfect travel destination.

Your goal is to help a group of friends decide on their next trip by recommending the best option from a given list of suggestions, based on their detailed preferences.

Analyze the 'Group Preferences' carefully, and then evaluate each 'Suggestion' against these preferences.
Choose ONE suggestion that is the absolute best fit.

---
Group Preferences:
{{{groupPreferences}}}

---
Suggestions:
{{#each suggestions}}
Suggestion {{ @index }}:
  Link: {{{this.link}}}
  Notes: {{{this.notes}}}
  Added By: {{{this.addedBy}}}

{{/each}}

---
Based on the above, which suggestion is the best fit? Provide your recommendation as a JSON object with the 0-based index of the best suggestion and a detailed explanation of your choice.`,
});

const aiTripSuggestionRecommendationFlow = ai.defineFlow(
  {
    name: 'aiTripSuggestionRecommendationFlow',
    inputSchema: AiTripSuggestionRecommendationInputSchema,
    outputSchema: AiTripSuggestionRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
