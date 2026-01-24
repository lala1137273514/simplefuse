-- SimpleFuse ClickHouse Schema
-- 003_scores.sql - 评测分数表
-- 存储所有评测结果

CREATE TABLE IF NOT EXISTS simplefuse.scores (
    -- 主键
    id String,
    trace_id String,
    observation_id Nullable(String),
    project_id String,
    
    -- 评测器信息
    evaluator_id String,
    evaluator_name String,
    
    -- 评分
    score Float64,
    
    -- 评测理由 (LLM 生成的解释)
    reasoning Nullable(String) CODEC(ZSTD(3)),
    
    -- 来源: api | auto | manual
    source LowCardinality(String) DEFAULT 'auto',
    
    -- 数据类型: numeric | categorical | boolean
    data_type LowCardinality(String) DEFAULT 'numeric',
    
    -- 分类评测的字符串值
    string_value Nullable(String),
    
    -- 关联的评测任务
    eval_job_id Nullable(String),
    
    -- 时间戳
    timestamp DateTime64(3),
    created_at DateTime64(3) DEFAULT now(),
    event_ts DateTime64(3),
    is_deleted UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree(event_ts, is_deleted)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, evaluator_name, toDate(timestamp), id)
SETTINGS index_granularity = 8192;

-- 创建索引
ALTER TABLE simplefuse.scores ADD INDEX idx_evaluator evaluator_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE simplefuse.scores ADD INDEX idx_source source TYPE bloom_filter GRANULARITY 4;
ALTER TABLE simplefuse.scores ADD INDEX idx_job eval_job_id TYPE bloom_filter GRANULARITY 4;
