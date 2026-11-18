import { authHandlers } from './authHandlers';
import { systemLogHandlers } from './systemLogHandlers';

export const handlers = [...authHandlers, ...systemLogHandlers];
