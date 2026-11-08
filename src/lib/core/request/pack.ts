import { definePack } from '../cli/index.js';
import { MakeRequestCommand } from './commands/MakeRequestCommand.js';

export default definePack({
  name: 'request',
  description: 'HttpRequest, FormRequest and make:request',
  commands: [MakeRequestCommand],
});
