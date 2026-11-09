import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Activity } from '../models/Activity.js';
import type { User } from '../models/User.js';

class ActivityController extends Controller {
  async index(req: HttpRequest) {
    const user = this.user<User>(req);
    const { page, perPage } = this.pageParams(req);
    return this.paginated(await Activity.forUser(user.id, page, perPage));
  }
}

export const activityController = new ActivityController();
