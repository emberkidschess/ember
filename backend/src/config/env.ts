import dotenv from 'dotenv';
import logger from '../utils/logger';
import { validateEnvVarsOnStart } from '../utils/envValidation';

dotenv.config();

const validateEnv = (): void => {
  validateEnvVarsOnStart();
};

export { validateEnv };
