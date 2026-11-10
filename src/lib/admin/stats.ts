import { config } from '../core/config/index.js';
import { DB } from '../core/query/index.js';

const DAY = 86_400_000;

const dayKey = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: config('app.timezone'),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export async function userStats(days: number) {
  const since = new Date(Date.now() - days * DAY);

  const [totalUsers, suspendedUsers, activeRows] = await Promise.all([
    DB.table('users').count(),
    DB.table('users').whereNotNull('suspended_at').count(),
    DB.select(
      `select count(*) as c from users u
       where u.suspended_at is null and (
         exists (select 1 from account_activities a
                 where a.user_id = u.id and a.event = 'login' and a.created_at >= ?)
         or exists (select 1 from access_tokens t
                 where t.user_id = u.id and t.last_used_at >= ?)
       )`,
      [since, since],
    ),
  ]);

  return {
    totalUsers,
    activeUsers: Number(activeRows[0]?.['c'] ?? 0),
    suspendedUsers,
    windowDays: days,
  };
}

export async function activeUsersChart(days: number) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await DB.table('account_activities')
    .where('event', 'login')
    .where('created_at', '>=', since)
    .select('user_id', 'created_at')
    .get();

  const perDay = new Map<string, Set<number>>();
  for (const row of rows) {
    const key = dayKey(new Date(row['created_at'] as string | number | Date));
    const users = perDay.get(key) ?? new Set<number>();
    users.add(Number(row['user_id']));
    perDay.set(key, users);
  }

  const points = Array.from({ length: days }, (_, index) => {
    const date = dayKey(new Date(Date.now() - (days - 1 - index) * DAY));
    return { date, activeUsers: perDay.get(date)?.size ?? 0 };
  });

  return { windowDays: days, points };
}
