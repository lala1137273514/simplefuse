import { router } from './trpc'
import { tracesRouter } from './routers/traces'
import { evaluatorsRouter } from './routers/evaluators'
import { llmConfigsRouter } from './routers/llmConfigs'
import { evalJobsRouter } from './routers/evalJobs'
import { statisticsRouter } from './routers/statistics'
import { datasetsRouter } from './routers/datasets'
import { difyConnectionsRouter } from './routers/difyConnections'
import { resultsRouter } from './routers/results'
import { datasetRunsRouter } from './routers/datasetRuns'

export const appRouter = router({
  traces: tracesRouter,
  evaluators: evaluatorsRouter,
  llmConfigs: llmConfigsRouter,
  evalJobs: evalJobsRouter,
  statistics: statisticsRouter,
  datasets: datasetsRouter,
  difyConnections: difyConnectionsRouter,
  results: resultsRouter,
  datasetRuns: datasetRunsRouter,
})

export type AppRouter = typeof appRouter
