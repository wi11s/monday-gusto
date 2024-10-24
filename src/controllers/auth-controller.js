import { MONDAY_SIGNING_SECRET, GUSTO_OAUTH_CLIENT_ID, GUSTO_OAUTH_CLIENT_SECRET } from '../constants/secret-keys.js';
import { getSecret } from '../helpers/secret-store.js';
import { MondayAuthManager } from '../services/auth-service.js';
import logger from '../services/logger/index.js';
import { ConnectionModelService } from '../services/model-services/connection-model-service.js';
import jwt from 'jsonwebtoken';

const TAG = 'auth_controller';
const mondayAuthManager = new MondayAuthManager();
const connectionModelService = new ConnectionModelService();

/**
 * Begins the Gusto OAuth flow.
 */
export const authorize = async (req, res) => {
  const { userId, backToUrl } = req.session;

  // Check if the user has already connected their Gusto and monday.com accounts
  const connection = await connectionModelService.getConnectionByUserId(userId);
  if (connection?.gustoToken && connection?.mondayToken) {
    return res.redirect(backToUrl);
  }

  const client_id = getSecret(GUSTO_OAUTH_CLIENT_ID);
  const redirect_uri = `https://live1-service-20654584-cdf5c743.us.monday.app/redirect`
  const redirect_uri_for_url = encodeURIComponent(redirect_uri);

  const mondayToken = jwt.sign({ userId, backToUrl }, getSecret(MONDAY_SIGNING_SECRET));

  const gustoAuthorizationUrl = `https://api.gusto-demo.com/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri_for_url}&response_type=code&state=${mondayToken}`
  return res.redirect(gustoAuthorizationUrl);
};

/**
 * Retrieves an monday.com OAuth token and then redirects the user to the backToUrl.
 * Docs: https://developer.monday.com/apps/docs/integration-authorization#authorization-url-example
 * @todo Connect this to your product's OAuth flow.
 */
export const mondayCallback = async (req, res) => {
  const { code, state: mondayToken } = req.query;
  const { userId, backToUrl } = jwt.verify(mondayToken, getSecret(MONDAY_SIGNING_SECRET));
  logger.info('monday oauth callback', TAG, { userId, code, backToUrl });

  try {
    const mondayToken = await mondayAuthManager.getToken(code);
    await connectionModelService.upsertConnection(userId, { mondayToken });

    return res.redirect(backToUrl);
  } catch (err) {
    logger.error('monday oauth callback failed', TAG, { userId, error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
};

/**
 * Retrieves an Github OAuth token and then redirects to monday.com OAuth flow.
 * Docs: https://developer.monday.com/apps/docs/integration-authorization#authorization-url-example
 * @todo Connect this to your product's OAuth flow.
 */
export const gustoRedirect = async (req, res) => {
  const { code, state: mondayToken } = req.query;
  const { userId, backToUrl } = jwt.verify(mondayToken, getSecret(MONDAY_SIGNING_SECRET));
  logger.info('gusto oauth callback', TAG, { userId, code, backToUrl });

  try {
    const gustoAuthUrl = 'https://api.gusto-demo.com/oauth/token'
    const body = {
      client_id: getSecret(GUSTO_OAUTH_CLIENT_ID),
      client_secret: getSecret(GUSTO_OAUTH_CLIENT_SECRET),
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `https://live1-service-20654584-cdf5c743.us.monday.app/redirect`
    }
    const gustoToken = await fetch(gustoAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      logger.info('GUSTO TOKEN', TAG, { data })
      return data.access_token
    });

    await connectionModelService.upsertConnection(userId, { gustoToken });

    const mondayAuthorizationUrl = mondayAuthManager.getAuthorizationUrl(userId, mondayToken);
    return res.redirect(mondayAuthorizationUrl);
  } catch (err) {
    logger.error('gusto oauth callback failed', TAG, { userId, error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
};
