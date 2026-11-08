import { Command } from '../../cli/index.js';
export declare class RouteListCommand extends Command {
    readonly signature = "route:list {--file= : Routes file to load (defaults to src/routes/api.ts in development or dist/routes/api.js in production)} {--prefix=/api : Path the router is mounted on} {--method= : Only this HTTP method} {--name= : Only names containing this text} {--path= : Only URIs containing this text} {--middleware= : Only routes using this middleware} {--json : Print JSON instead of a table}";
    readonly description = "List every route declared with the Route facade";
    handle(): Promise<number>;
}
//# sourceMappingURL=RouteListCommand.d.ts.map