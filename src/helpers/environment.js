import { getSecret } from './secret-store.js';
import { DEVELOPMENT_ENV } from '../constants/general.js';
import { BASE_URL, NODE_ENV, SERVICE_TAG_URL } from '../constants/secret-keys.js';
import { cache, cacheKeys } from '../services/cache-service.js';

export const getEnv = () => (getSecret(NODE_ENV) || DEVELOPMENT_ENV).toLowerCase();
export const isDevelopmentEnv = () => getEnv() === DEVELOPMENT_ENV;
export const isProductionEnv = () => !isDevelopmentEnv();

/**
 * Returns the appropriate URL for the service based on the environment.
 *
 * In the production environment, the service tag URL is injected into the environment
 * by monday-code. For development, the BASE_URL is used to access the service.
 *
 * @returns {string} The service URL based on the environment.
 */
export const getBaseUrl = () => {
  if (isDevelopmentEnv()) {
    return cache.get(cacheKeys.SERVER_URL);
  }

  return `https://${getSecret(SERVICE_TAG_URL)}`;
};
