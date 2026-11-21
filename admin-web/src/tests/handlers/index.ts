import { authHandlers } from './authHandlers';
import { bannerHandlers } from './bannerHandlers';
import { blogHandlers } from './blogHandlers';
import { contentPageHandlers } from './contentPageHandlers';
import { faqHandlers } from './faqHandlers';
import { leadHandlers } from './leadHandlers';
import { propertyHandlers } from './propertyHandlers';
import { siteVisitHandlers } from './siteVisitHandlers';
import { subscriptionPlanHandlers } from './subscriptionPlanHandlers';
import { systemLogHandlers } from './systemLogHandlers';
import { userHandlers } from './userHandlers';

export const handlers = [
  ...authHandlers,
  ...systemLogHandlers,
  ...userHandlers,
  ...propertyHandlers,
  ...leadHandlers,
  ...siteVisitHandlers,
  ...subscriptionPlanHandlers,
  ...bannerHandlers,
  ...blogHandlers,
  ...faqHandlers,
  ...contentPageHandlers,
];
