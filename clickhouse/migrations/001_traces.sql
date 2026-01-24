-- SimpleFuse ClickHouse Schema
-- 001_traces.sql - Trace 跟踪表
-- 存储所有 LLM 调用的完整跟踪记录

CREATE TABLE IF NOT EXISTS simplefuse.traces (
    -- 主键
    id String,
    project_id String,
    
    -- Dify 关联
    dify_connection_id String DEFAULT '',
    workflow_name String DEFAULT '',
    
    -- 基础信息
    name String DEFAULT '',
    timestamp DateTime64(3),
    
    -- 用户信息
    user_id Nullable(String),
    session_id Nullable(String),
    
    -- 输入输出 (使用 ZSTD 压缩大文本)
    input String CODEC(ZSTD(3)),
    output String CODEC(ZSTD(3)),
    
    -- 元数据
    metadata Map(String, String),
    tags Array(String),
    
    -- 性能指标
    total_tokens Nullable(UInt32),
    latency_ms Nullable(UInt32),
    
    -- 状态
    status LowCardinality(String) DEFAULT 'success',
    
    -- 时间戳
    created_at DateTime64(3) DEFAULT now(),
    event_ts DateTime64(3),
    is_deleted UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree(event_ts, is_deleted)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, toDate(timestamp), id)
SETTINGS index_granularity = 8192;

-- 创建索引优化查询
ALTER TABLE simplefuse.traces ADD INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE simplefuse.traces ADD INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE simplefuse.traces ADD INDEX idx_workflow workflow_name TYPE bloom_filter GRANULARITY 4;
