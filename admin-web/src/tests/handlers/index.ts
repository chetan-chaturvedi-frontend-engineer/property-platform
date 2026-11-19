import { authHandlers } from './authHandlers';
import { propertyHandlers } from './propertyHandlers';
import { systemLogHandlers } from './systemLogHandlers';
import { userHandlers } from './userHandlers';

export const handlers = [
  ...authHandlers,
  ...systemLogHandlers,
  ...userHandlers,
  ...propertyHandlers,
];
