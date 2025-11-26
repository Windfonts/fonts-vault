-- 添加字体状态字段
ALTER TABLE fonts ADD COLUMN status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'offline'));

-- 为现有字体设置默认状态为已发布
UPDATE fonts SET status = 'published' WHERE status IS NULL;
