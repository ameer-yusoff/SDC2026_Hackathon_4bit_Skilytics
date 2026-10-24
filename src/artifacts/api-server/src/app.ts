import express, { type Express, type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { apiCors } from "./lib/api-cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachIdentity } from "./lib/auth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(apiCors);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", attachIdentity, router);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "cv_too_large" });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "invalid_input", issues: err.issues });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({
    error: "server_error",
    message: err instanceof Error ? err.message : String(err),
  });
};
app.use(errorHandler);

export default app;
