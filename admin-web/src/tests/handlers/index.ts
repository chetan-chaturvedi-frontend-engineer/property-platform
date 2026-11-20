import { authHandlers } from './authHandlers';
import { leadHandlers } from './leadHandlers';
import { propertyHandlers } from './propertyHandlers';
import { systemLogHandlers } from './systemLogHandlers';
import { userHandlers } from './userHandlers';

export const handlers = [
  ...authHandlers,
  ...systemLogHandlers,
  ...userHandlers,
  ...propertyHandlers,
  ...leadHandlers,
];
