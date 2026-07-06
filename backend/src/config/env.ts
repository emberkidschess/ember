import logger from '../utils/logger';
import { validateEnvVarsOnStart } from '../utils/envValidation';

// Environment variables are provided by Render in production
const validateEnv = (): void => {
  validateEnvVarsOnStart();
};

export { validateEnv };
