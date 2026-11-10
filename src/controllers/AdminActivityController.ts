import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Activity } from '../models/Activity.js';

class AdminActivityController extends Controller {
  async index(req: HttpRequest) {
    const data = await this.validate<{ limit?: string }>(
      req,
      { limit: 'sometimes|integer|min:1|max:50' },
      { source: 'query' },
    );
    const limit = data.limit === undefined ? 10 : Number(data.limit);
    return this.ok(await Activity.recent(limit));
  }
}

export const adminActivityController = new AdminActivityController();
