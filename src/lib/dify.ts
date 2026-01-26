/**
 * Dify API 客户端
 * 用于连接和同步 Dify 工作流
 */

export interface DifyWorkflow {
  id: string;
  name: string;
  description: string;
}

export interface DifyTestResult {
  success: boolean;
  message: string;
}

/**
 * 测试 Dify 连接
 */
export async function testDifyConnection(
  apiEndpoint: string,
  apiKey: string,
): Promise<DifyTestResult> {
  try {
    const response = await fetch(`${apiEndpoint}/v1/apps`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { success: true, message: "连接成功" };
    } else {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: error.message || `连接失败: ${response.status}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "网络错误",
    };
  }
}

/**
 * 获取 Dify 工作流列表
 */
export async function fetchDifyWorkflows(
  apiEndpoint: string,
  apiKey: string,
): Promise<DifyWorkflow[]> {
  try {
    const response = await fetch(`${apiEndpoint}/v1/apps`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`获取工作流失败: ${response.status}`);
    }

    const data = await response.json();

    // Dify API 返回格式: { data: [...] }
    const apps = data.data || [];

    return apps.map(
      (app: { id: string; name: string; description?: string }) => ({
        id: app.id,
        name: app.name,
        description: app.description || "",
      }),
    );
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "获取工作流失败");
  }
}

/**
 * 生成 Webhook URL
 */
export function generateWebhookUrl(
  connectionId: string,
  baseUrl?: string,
): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/v1/traces/webhook/${connectionId}`;
}

/**
 * 生成随机 Webhook Secret
 */
export function generateWebhookSecret(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 验证 Webhook 签名
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // 简化实现，实际应使用 HMAC-SHA256
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === `sha256=${expectedSignature}`;
}
