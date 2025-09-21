import { ConfigurableModuleAsyncOptions, DynamicModule } from '@nestjs/common';

declare module "@golevelup/nestjs-rabbitmq" {
  interface RabbitMQModule {
    // You can extend instance methods here if needed
  }

  namespace RabbitMQModule {
    function forRootAsync(
      options: ConfigurableModuleAsyncOptions<any>,
    ): DynamicModule;
  }
}
