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
    port: number | string;
  };
}

export default (): ExpectedConfig => {
  return {
    redis: {
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
    },
    postgres: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
    },
    fluentbit: {
      application: process.env.APP_NAME,
      host: process.env.FLUENTBIT_HOST,
      port: process.env.FLUENTBIT_PORT,
    },
    rabbitmq: {
      host: process.env.RABBITMQ_HOST,
      port: process.env.RABBITMQ_PORT,
      user: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASSWORD,
    },
  } as ExpectedConfig;
};
