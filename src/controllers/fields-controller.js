import { ConnectionModelService } from '../services/model-services/connection-model-service.js';
import logger from '../services/logger/index.js';

const TAG = 'fields_controller';
const connectionModelService = new ConnectionModelService();
/**
 * This function returns an array of options to populate a dropdown in the recipe editor.
 * In this example, it returns a list of Github repositories.
 * Docs: https://developer.monday.com/apps/docs/custom-fields#list-field-type
 * @todo (Optional) Define the remote options your blocks need to function.
 */
export async function getRemoteListOptions(req, res) {
  const { userId } = req.session;
  try {
    logger.info('get remote list options', TAG, { userId });

    const { githubToken } = await connectionModelService.getConnectionByUserId(userId);
    logger.info('github token', TAG, { ghToken: githubToken });

    const options = await githubService.getRepositories(githubToken);
    logger.info('remote list options', TAG, { 'options': options });

    return res.status(200).send(options);
  } catch (err) {
    logger.error('failed to get remote list options', TAG, { userId, error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
}

/**
 * This function returns a list of fields that your app supports in dynamic mapping.
 * Your app can then map data from your product into a monday item (and vice versa).
 * In this example, the definitions are hardcoded in the '../constants/github.js' file.
 * Docs: https://developer.monday.com/apps/docs/dynamic-mapping
 * @todo (Optional) Define the mappable fields that your app will support.
 */
export async function getFieldDefs(req, res) {
  try {
    const fieldDefs = githubService.getIssueFieldDefs();
    return res.status(200).send(fieldDefs);
  } catch (err) {
    logger.error('failed to get field definitions', TAG, { error: err.message });
    return res.status(500).send({ message: 'internal server error' });
  }
}
