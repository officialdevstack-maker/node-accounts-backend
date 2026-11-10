import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { activeUsersChart, userStats } from '../lib/admin/stats.js';

class AdminStatsController extends Controller {
  private async days(req: HttpRequest, fallback: number): Promise<number> {
    const data = await this.validate<{ days?: string }>(
      req,
      { days: 'sometimes|integer|min:1|max:90' },
      { source: 'query' },
    );
    return data.days === undefined ? fallback : Number(data.days);
  }

  async summary(req: HttpRequest) {
    return this.ok(await userStats(await this.days(req, 30)));
  }

  async activeChart(req: HttpRequest) {
    return this.ok(await activeUsersChart(await this.days(req, 30)));
  }
}

export const adminStatsController = new AdminStatsController();
