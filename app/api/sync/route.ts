import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/services/sync.service';
import { withAdmin, handleApiError } from '@/lib/auth/api-guard';
import { logger } from '@/lib/logger';

/**
 * POST /api/sync
 * 触发从OSS同步字体列表
 * 需要管理员认证
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    logger.info('[API-sync] 开始同步字体列表');

    // 执行同步
    const result = await syncService.syncFromOSS();

    logger.info('[API-sync] 同步完成', {
      added: result.added,
      updated: result.updated,
      failed: result.failed.length,
    });

    return NextResponse.json({
      code: 200,
      data: {
        added: result.added,
        updated: result.updated,
        failed: result.failed.length,
        failedDetails: result.failed,
      },
      message: `同步完成: 新增 ${result.added} 个，更新 ${result.updated} 个，失败 ${result.failed.length} 个`,
    });
  } catch (error) {
    logger.error('[API-sync] 同步失败', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleApiError(error);
  }
});

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam))) : 50;
    logger.info('[API-sync] 获取OSS元数据预览', { limit });

    const preview = await syncService.fetchMetadataPreview(limit);

    return NextResponse.json({
      code: 200,
      data: preview,
      message: '获取元数据预览成功',
    });
  } catch (error) {
    logger.error('[API-sync] 获取元数据预览失败', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleApiError(error);
  }
});
