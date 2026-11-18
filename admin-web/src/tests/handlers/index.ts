import { authHandlers } from './authHandlers';
import { systemLogHandlers } from './systemLogHandlers';
import { userHandlers } from './userHandlers';

export const handlers = [...authHandlers, ...systemLogHandlers, ...userHandlers];
