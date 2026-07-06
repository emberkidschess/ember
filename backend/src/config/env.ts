import logger from '../utils/logger';
import { validateEnvVarsOnStart } from '../utils/envValidation';

// Load environment variables only in non-production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const validateEnv = (): void => {
  validateEnvVarsOnStart();
};

export { validateEnv };
