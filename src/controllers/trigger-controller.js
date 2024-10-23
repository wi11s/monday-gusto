import { SubscriptionModelService } from '../services/model-services/subscription-model-service.js';
import { ConnectionModelService } from '../services/model-services/connection-model-service.js';
import * as mondayTriggersService from '../services/monday-triggers-service.js';
import logger from '../services/logger/index.js';

const TAG = 'trigger_controller';
const connectionModelService = new ConnectionModelService();

/**
 * Creates a Subscription and Github webhook.
 * Called when a user adds the integration to their board.
 * Docs: https://developer.monday.com/apps/docs/custom-trigger#subscribing-to-your-trigger
 */
export async function subscribe(req, res) {
  const { userId } = req.session;
  const { payload } = req.body;
  const { webhookUrl } = payload;

  try {
    logger.info('subscribe trigger received', TAG, { userId });

    /**
     * 1. Store token by generated Subscription ID
     * 2. Store data related to subscription in monday-code storage api
     */

    const { mondayToken, githubToken } = await connectionModelService.getConnectionByUserId(userId);
    const subscriptionModelService = new SubscriptionModelService(mondayToken);
    const { id: subscriptionId } = await subscriptionModelService.createSubscription({
      mondayWebhookUrl: webhookUrl,
      mondayUserId: userId
    });

    return res.status(200).send({ subscriptionId: subscriptionId });
  } catch (err) {
    logger.error('failed to subscribe to webhook', TAG, { userId, error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
}

/**
 * Removes the Subscription and webhook associated with a specific integration.
 * Called when a user deletes or turns off the integration on their board.
 * Docs: https://developer.monday.com/apps/docs/custom-trigger#unsubscribing-from-your-trigger
 */
export async function unsubscribe(req, res) {
  const { userId } = req.session;
  const { webhookId: subscriptionId } = req.body.payload;

  try {
    logger.info('unsubscribe trigger received', TAG, { userId, subscriptionId });
    const { mondayToken } = await connectionModelService.getConnectionByUserId(userId);
    const subscriptionModelService = new SubscriptionModelService(mondayToken);

    await subscriptionModelService.deleteSubscription(subscriptionId);
    return res.status(200).send({ result: 'Unsubscribed successfully.' });
  } catch (err) {
    logger.error('failed to unsbscribe', TAG, { userId, error: err.message, subscriptionId });
    return res.status(500).send({ message: 'internal server error' });
  }
}