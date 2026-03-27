'use server';
/**
 * @fileOverview A GenAI tool for providing personalized store and product recommendations to clients.
 *
 * - clientPersonalizedRecommendations - A function that handles the personalized recommendation process.
 * - ClientPersonalizedRecommendationsInput - The input type for the clientPersonalizedRecommendations function.
 * - ClientPersonalizedRecommendationsOutput - The return type for the clientPersonalizedRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for personalized recommendations
const ClientPersonalizedRecommendationsInputSchema = z.object({
  clientUid: z.string().describe('The unique ID of the client for whom to generate recommendations.'),
  currentCityId: z.string().describe('The ID of the city where the client is currently located, to filter available stores and products.'),
  clientPastOrderStoreIds: z.array(z.string()).describe('A list of IDs of stores from which the client has ordered in the past.'),
  clientPastOrderProductIds: z.array(z.string()).describe('A list of IDs of products the client has ordered in the past.'),
  clientBrowsedStoreIds: z.array(z.string()).describe('A list of IDs of stores the client has recently browsed.'),
  clientBrowsedProductIds: z.array(z.string()).describe('A list of IDs of products the client has recently browsed.'),
  allAvailableStoresInCity: z.array(z.object({
    store_id: z.string().describe('Unique ID of the store.'),
    name_ar: z.string().describe('Arabic name of the store.'),
    filter_id: z.string().optional().describe('The category/filter ID associated with the store.'),
    rating: z.number().optional().describe('Average rating of the store.'),
    logo_url: z.string().optional().describe('URL to the store logo.'),
    address_text: z.string().optional().describe('Text address of the store.'),
  })).describe('A comprehensive list of all available stores in the client\'s current city, including their details.'),
  allAvailableProductsInCity: z.array(z.object({
    product_id: z.string().describe('Unique ID of the product.'),
    name_ar: z.string().describe('Arabic name of the product.'),
    store_id: z.string().describe('ID of the store offering this product.'),
    category_id: z.string().optional().describe('The category ID of the product.'),
    base_price: z.number().optional().describe('Base price of the product.'),
    main_image: z.string().optional().describe('URL to the main image of the product.'),
  })).describe('A comprehensive list of all available products in the client\'s current city, including their details.'),
});
export type ClientPersonalizedRecommendationsInput = z.infer<typeof ClientPersonalizedRecommendationsInputSchema>;

// Output schema for personalized recommendations
const ClientPersonalizedRecommendationsOutputSchema = z.object({
  recommendedStores: z.array(z.object({
    store_id: z.string().describe('The ID of the recommended store. Must be one of the provided available stores.'),
    name_ar: z.string().describe('The Arabic name of the recommended store.'),
    reason: z.string().describe('A brief, compelling reason in Arabic for recommending this store, based on client history and preferences.'),
  })).describe('A list of personalized store recommendations for the client.'),
  recommendedProducts: z.array(z.object({
    product_id: z.string().describe('The ID of the recommended product. Must be one of the provided available products.'),
    name_ar: z.string().describe('The Arabic name of the recommended product.'),
    store_id: z.string().describe('The ID of the store offering this recommended product.'),
    reason: z.string().describe('A brief, compelling reason in Arabic for recommending this product, based on client history and preferences.'),
  })).describe('A list of personalized product recommendations for the client.'),
});
export type ClientPersonalizedRecommendationsOutput = z.infer<typeof ClientPersonalizedRecommendationsOutputSchema>;

// Define the prompt for personalized recommendations
const personalizedRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedRecommendationsPrompt',
  input: { schema: ClientPersonalizedRecommendationsInputSchema },
  output: { schema: ClientPersonalizedRecommendationsOutputSchema },
  prompt: `أنت محرك توصيات ذكي لمنصة التوصيل "أبشر". هدفك هو تقديم توصيات شخصية للغاية للمتاجر والمنتجات للعميل، بناءً على أنشطته السابقة والخيارات المتاحة.

قم بتحليل سجل طلبات العميل السابق ({{clientPastOrderStoreIds}} و {{clientPastOrderProductIds}}) وسلوك التصفح الأخير ({{clientBrowsedStoreIds}} و {{clientBrowsedProductIds}}).
خذ بعين الاعتبار خصائص المتاجر والمنتجات المتاحة في مدينة العميل الحالية ({{currentCityId}}).
يجب عليك التوصية فقط بالمتاجر من قائمة 'allAvailableStoresInCity' والمنتجات من قائمة 'allAvailableProductsInCity'.

عند التوصية، أعطِ الأولوية لما يلي:
1. المتاجر/المنتجات المشابهة لتلك التي تم طلبها أو تصفحها سابقًا.
2. المتاجر ذات التقييم العالي أو المنتجات الشائعة، إذا لم يكن هناك نمط واضح من السجل.
3. مجموعة متنوعة من التوصيات قدر الإمكان.

قدم بحد أقصى 5 توصيات للمتاجر و 5 توصيات للمنتجات.
لكل توصية، قم بتضمين 'store_id'/'product_id'، و 'name_ar'، و 'reason' موجز ومقنع باللغة العربية يشرح سبب التوصية بهذا المتجر/المنتج تحديدًا للعميل، بناءً على سجل العميل وتفضيلاته. يجب أن تكون الأسباب مقنعة وتسلط الضوء على الفوائد أو الصلة الفريدة.

المتاجر المتاحة في المدينة:
{{#each allAvailableStoresInCity}}
  - ID: {{this.store_id}}, الاسم: {{this.name_ar}}, التقييم: {{this.rating}}, الفئة: {{this.filter_id}}
{{/each}}

المنتجات المتاحة في المدينة:
{{#each allAvailableProductsInCity}}
  - ID: {{this.product_id}}, الاسم: {{this.name_ar}}, معرف المتجر: {{this.store_id}}, الفئة: {{this.category_id}}, السعر: {{this.base_price}}
{{/each}}

معرف العميل: {{{clientUid}}}
معرفات المتاجر التي طلب منها سابقًا: {{{clientPastOrderStoreIds}}}
معرفات المنتجات التي طلبها سابقًا: {{{clientPastOrderProductIds}}}
معرفات المتاجر التي تصفحها: {{{clientBrowsedStoreIds}}}
معرفات المنتجات التي تصفحها: {{{clientBrowsedProductIds}}}

الرجاء إخراج التوصيات بتنسيق JSON مطابق للمخطط المحدد.
`,
});

// Define the Genkit flow
const clientPersonalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'clientPersonalizedRecommendationsFlow',
    inputSchema: ClientPersonalizedRecommendationsInputSchema,
    outputSchema: ClientPersonalizedRecommendationsOutputSchema,
  },
  async (input) => {
    if (input.allAvailableProductsInCity.length === 0 && input.allAvailableStoresInCity.length === 0) {
        return {
            recommendedStores: [],
            recommendedProducts: []
        };
    }
    // Call the prompt to get recommendations
    const { output } = await personalizedRecommendationsPrompt(input);
    // The prompt is designed to directly output the desired schema,
    // so we can return its output directly.
    return output!;
  }
);

/**
 * Generates personalized recommendations for stores and products for a client
 * based on their past order history and browsing behavior within their current city.
 *
 * @param input - The client's ID, city, order history, browsing history, and lists of available stores and products.
 * @returns A promise that resolves to an object containing lists of recommended stores and products.
 */
export async function clientPersonalizedRecommendations(
  input: ClientPersonalizedRecommendationsInput
): Promise<ClientPersonalizedRecommendationsOutput> {
  return clientPersonalizedRecommendationsFlow(input);
}
