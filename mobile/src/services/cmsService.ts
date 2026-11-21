import { Banner, CmsPage, Faq, FaqCategory } from '../types';
import { ApiBanner, ApiCmsPage, ApiFaq, ApiFaqCategory, ApiPage } from '../types/api';
import { apiClient } from './api/apiClient';
import { toBanner, toCmsPage, toFaq } from './mappers/cmsMapper';

const PAGE_SIZE = 100;

/** Public, read-only content managed from the admin dashboard (no login needed). */
export const cmsService = {
  async page(slug: string): Promise<CmsPage> {
    return toCmsPage(await apiClient.get<ApiCmsPage>(`/public/pages/${encodeURIComponent(slug)}`, { auth: false }));
  },

  async faqs(category?: string): Promise<Faq[]> {
    const query = category ? `&category=${encodeURIComponent(category)}` : '';
    const page = await apiClient.get<ApiPage<ApiFaq>>(`/public/faqs?size=${PAGE_SIZE}${query}`, { auth: false });
    return page.content.map(toFaq);
  },

  async faqCategories(): Promise<FaqCategory[]> {
    return apiClient.get<ApiFaqCategory[]>('/public/faq-categories', { auth: false });
  },

  async banners(placement: string): Promise<Banner[]> {
    const page = await apiClient.get<ApiPage<ApiBanner>>(
      `/public/banners?placement=${encodeURIComponent(placement)}`,
      { auth: false },
    );
    return page.content.map(toBanner).filter((b): b is Banner => b !== null);
  },
};
