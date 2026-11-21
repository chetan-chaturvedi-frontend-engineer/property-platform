import { useAsync } from '../../../hooks/useAsync';
import { cmsService } from '../../../services/cmsService';

export const useCmsPage = (slug: string) => useAsync(() => cmsService.page(slug), [slug]);
export const useFaqCategories = () => useAsync(() => cmsService.faqCategories());
export const useFaqs = (category?: string) => useAsync(() => cmsService.faqs(category), [category]);
export const useBanners = (placement: string) => useAsync(() => cmsService.banners(placement), [placement]);
