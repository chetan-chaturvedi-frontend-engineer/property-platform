import { Banner, CmsPage, Faq } from '../../types';
import { ApiBanner, ApiCmsPage, ApiFaq } from '../../types/api';
import { htmlToText } from '../../utils/html';
import { absoluteUrl } from './propertyMapper';

export function toCmsPage(p: ApiCmsPage): CmsPage {
  return { heading: p.heading, body: htmlToText(p.content) };
}

export function toFaq(f: ApiFaq): Faq {
  return { id: f.id, question: f.question, answer: htmlToText(f.answer), category: f.category };
}

export function toBanner(b: ApiBanner): Banner | null {
  const imageUrl = absoluteUrl(b.imageUrl);
  return imageUrl ? { id: b.id, title: b.title, imageUrl, link: b.link, linkType: b.linkType } : null;
}
