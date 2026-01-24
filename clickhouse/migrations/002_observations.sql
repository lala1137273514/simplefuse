-- SimpleFuse ClickHouse Schema
-- 002_observations.sql - 观测表
-- 存储 Trace 中的每个节点执行记录 (LLM 调用、工具调用等)

CREATE TABLE IF NOT EXISTS simplefuse.observations (
    -- 主键
    id String,
    trace_id String,
    project_id String,
    
    -- 类型: generation | span | event
    type LowCardinality(String),
    
    -- 层级关系
    parent_observation_id Nullable(String),
    
    -- 基础信息
    name String DEFAULT '',
    start_time DateTime64(3),
    end_time Nullable(DateTime64(3)),
    
    -- 输入输出
    input Nullable(String) CODEC(ZSTD(3)),
    output Nullable(String) CODEC(ZSTD(3)),
    
    -- LLM 相关
    model Nullable(String),
    prompt_tokens Nullable(UInt32),
    completion_tokens Nullable(UInt32),
    total_tokens Nullable(UInt32),
    
    -- 性能
    latency_ms Nullable(UInt32),
    
    -- 状态
    status LowCardinality(String) DEFAULT 'success',
    status_message Nullable(String),
    
    -- 元数据
    metadata Map(String, String),
    
    -- 时间戳
    created_at DateTime64(3) DEFAULT now(),
    event_ts DateTime64(3),
    is_deleted UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree(event_ts, is_deleted)
PARTITION BY toYYYYMM(start_time)
ORDER BY (project_id, trace_id, id)
SETTINGS index_granularity = 8192;

-- 创建索引
ALTER TABLE simplefuse.observations ADD INDEX idx_type type TYPE bloom_filter GRANULARITY 4;
ALTER TABLE simplefuse.observations ADD INDEX idx_model model TYPE bloom_filter GRANULARITY 4;
