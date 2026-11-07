import { definePack } from '../cli/index.js';
import { MakeProviderCommand } from './commands/MakeProviderCommand.js';
import { ServeCommand } from './commands/ServeCommand.js';

export default definePack({
  name: 'boot',
  description: 'Application kernel: service providers, serve and make:provider',
  commands: [ServeCommand, MakeProviderCommand],
});
