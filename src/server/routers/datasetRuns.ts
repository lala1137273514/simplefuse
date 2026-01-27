// src/server/routers/datasetRuns.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import prisma from "@/lib/prisma";

export const datasetRunsRouter = router({
  // 创建运行
  create: publicProcedure
    .input(
      z.object({
        datasetId: z.string(),
        projectId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.datasetRun.create({ data: input });
    }),

  // 列表查询
  list: publicProcedure
    .input(
      z.object({
        datasetId: z.string(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input }) => {
      return prisma.datasetRun.findMany({
        where: { datasetId: input.datasetId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: { _count: { select: { items: true } } },
      });
    }),

  // 详情查询（含所有运行项）
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.datasetRun.findUnique({
        where: { id: input.id },
        include: {
          items: {
            include: { datasetItem: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }),

  // 添加运行项
  addItems: publicProcedure
    .input(
      z.object({
        datasetRunId: z.string(),
        items: z.array(
          z.object({
            datasetItemId: z.string(),
            input: z.any().optional(),
            expectedOutput: z.any().optional(),
            output: z.any().optional(),
            error: z.string().optional(),
            latencyMs: z.number().optional(),
            totalTokens: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.datasetRunItem.createMany({
        data: input.items.map((item) => ({
          ...item,
          datasetRunId: input.datasetRunId,
        })),
      });
    }),

  // 删除
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.datasetRun.delete({ where: { id: input.id } });
    }),
});
