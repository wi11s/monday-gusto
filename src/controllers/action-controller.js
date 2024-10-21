import { ConnectionModelService } from '../services/model-services/connection-model-service.js';
import logger from '../services/logger/index.js';
import mondaySdk from 'monday-sdk-js';

const TAG = 'action_controller';
const connectionModelService = new ConnectionModelService();

/**
 * This function runs when your action block is called from monday.
*/
export async function executeCreateAction(req, res) {
  const { accountId, userId } = req.session;
  const { inputFields } = req.body.payload;

  // Gets the blocks' required data from the input fields object.
  // You can define the input fields for your block by opening your integration feature and selecting Feature Details > Workflow Blocks
  // Input fields docs: https://developer.monday.com/apps/docs/custom-actions#configure-action-input-fields

  const itemId = inputFields.itemId;

  // get the item from the monday SDK
  const mondayClient = mondaySdk();
  
  const { mondayToken } = await connectionModelService.getConnectionByUserId(userId);
  mondayClient.setToken(mondayToken);

  const query = `query {
    items(ids: ${itemId}) {
      id
      name
      column_values {
        id
        value
        text
      }
    }
  }`;

  const response = await mondayClient.api(query);
  const item = response.data.items[0];

  const loggingOptions = { accountId, userId, item };

  try {
    // Retrieve the relevant user's OAuth token from the DB
    const { gustoToken } = await connectionModelService.getConnectionByUserId(userId);

    logger.info('MONDAY', TAG, { mondayToken });
    logger.info('GUSTO', TAG, { gustoToken });

    const firstName = item.name.split(' ')[0];
    const lastName = item.name.split(' ')[1];

    const email = item.column_values.find(column => column.id === 'text1').value

    // log names and email
    logger.info('create employee action execute', TAG, { firstName, lastName, email });

    // Call the Gusto API to create an employee.
    fetch('https://api.gusto-demo.com/v1/employees', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gustoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        first_name: firstName, 
        last_name: lastName,
        email: email }),
    })
    // .then(response => response.json())
    // .then(data => {
    //   logger.info('create employee action response', TAG, { ...loggingOptions, data });
    // });

    return res.status(200).send();
  } catch (err) {
    logger.error('create issue action failed', TAG, { ...loggingOptions, error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
}
