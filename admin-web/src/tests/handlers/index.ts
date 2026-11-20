import { authHandlers } from './authHandlers';
import { leadHandlers } from './leadHandlers';
import { propertyHandlers } from './propertyHandlers';
import { siteVisitHandlers } from './siteVisitHandlers';
import { systemLogHandlers } from './systemLogHandlers';
import { userHandlers } from './userHandlers';

export const handlers = [
  ...authHandlers,
  ...systemLogHandlers,
  ...userHandlers,
  ...propertyHandlers,
  ...leadHandlers,
  ...siteVisitHandlers,
];
