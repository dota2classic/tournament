import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export interface ExpectedConfig {
  redis: {
    host: string;
    password: string;
  };
  postgres: {
    host: string;
    username: string;
    password: string;
  };
  fluentbit: {
    host: string;
    port: number;
  };
}

export default (config = YAML_CONFIG_FILENAME): ExpectedConfig => {
  return yaml.load(readFileSync(join('./', config), 'utf8')) as ExpectedConfig;
};
