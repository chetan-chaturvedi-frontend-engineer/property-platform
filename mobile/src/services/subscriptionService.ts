import { MySubscription, SubscriptionPlan } from '../types';
import { ApiSubscriptionPlan, ApiUserSubscription } from '../types/api';
import { ApiError, apiClient } from './api/apiClient';
import { toMySubscription, toPlan } from './mappers/subscriptionMapper';

export const subscriptionService = {
  async plans(): Promise<SubscriptionPlan[]> {
    const plans = await apiClient.get<ApiSubscriptionPlan[]>('/public/subscription-plans', { auth: false });
    return plans.map(toPlan);
  },

  /** The subscription in force, or null when the user has none (the backend answers 404). */
  async mine(): Promise<MySubscription | null> {
    try {
      return toMySubscription(await apiClient.get<ApiUserSubscription>('/subscriptions/me'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return null;
      }
      throw e;
    }
  },

  async subscribe(planId: number): Promise<MySubscription> {
    return toMySubscription(await apiClient.post<ApiUserSubscription>('/subscriptions', { planId }));
  },
};
