import { definePack } from '../cli/index.js';
import { MakeModelCommand } from './commands/MakeModelCommand.js';
import { ModelCheckCommand } from './commands/ModelCheckCommand.js';

export default definePack({
  name: 'model',
  description: 'Base Model with casts, hidden attributes, hooks, soft deletes and make:model',
  commands: [MakeModelCommand, ModelCheckCommand],
});
