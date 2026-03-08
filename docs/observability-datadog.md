# Observability with Datadog

This project integrates **Datadog APM** (traces) and **log–trace correlation** via `dd-trace` and loggers that inject `dd.trace_id` and `dd.span_id` into every log.

## Requirements

- A [Datadog](https://www.datadoghq.com/) account (EU: `datadoghq.eu`, US: `datadoghq.com`).
- API key from **Organization Settings → API Keys**.

## Environment variables

| Variable      | Description                                      | Example              |
|---------------|--------------------------------------------------|----------------------|
| `DD_API_KEY`  | Datadog API key (required to send data)          | `xxxxxxxxxxxx`       |
| `DD_SITE`     | Datadog site region                              | `datadoghq.com` or `datadoghq.eu` |
| `DD_ENV`      | Environment (for APM/Logs filtering)              | `development`, `staging`, `production` |
| `DD_SERVICE`  | Service name (per container)                     | Set per service in `docker-compose` |

In **docker-compose** each service already has `DD_SERVICE` set (e.g. `catalog-service`, `users-service`). You only need to define in your `.env`:

```bash
DD_API_KEY=<your-api-key>
DD_SITE=datadoghq.com
DD_ENV=development
```

## How it works

1. **Tracer**  
   Containers start with `NODE_OPTIONS="-r dd-trace/init"`, so the Datadog tracer initializes before the app and automatically instruments HTTP, PostgreSQL, etc.

2. **Logs**  
   Loggers in `apps/<service>/src/common/logger.ts` call `getDatadogContext()`. When a span is active, `dd.trace_id` and `dd.span_id` are added to the log. In Datadog you can jump from a trace to its logs and vice versa.

3. **Sending logs to Datadog**  
   - **With Datadog Agent:** mount the agent socket or use TCP and configure your logger to send to the agent.  
   - **With API:** you can use Datadog Logs intake (e.g. from a sidecar or pipeline that sends stdout with `dd.trace_id` and `dd.span_id`).

## Viewing traces and logs in Datadog

- **APM → Traces:** you will see requests across catalog, users, auth, inventory, and order.
- **Logs:** if you send them to the agent or intake, you can filter by `dd.trace_id` or `dd.span_id` and link from a trace to its logs.

## Deployment on AWS (or other cloud)

- Install the **Datadog Agent** on the instance or run it as a sidecar and set `DD_AGENT_HOST` (and optionally `DD_TRACE_AGENT_PORT`) on containers so they send traces to the agent instead of the default intake.
- Keep `DD_API_KEY`, `DD_SITE`, `DD_ENV`, and `DD_SERVICE` (per service) in the runtime environment (environment variables or secrets).

## Without API key (local development)

If you do not set `DD_API_KEY`, the tracer still initializes but does not send data to Datadog. The application runs normally; logs still include `trace_id`/`span_id` when the tracer is active, which is useful for local debugging.
