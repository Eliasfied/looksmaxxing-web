type Workload = 'analysis' | 'chat'

// Keep inference without reasoning as the latency/cost baseline of the previous
// model. Rollback is explicit; a failed request never silently triggers a second
// paid inference. These variables are server-only.
export function aiModelOptions(
  workload: Workload,
  maxOutputTokens: number,
  temperature: number
) {
  const model =
    (workload === 'analysis'
      ? process.env.FACE_ANALYSIS_MODEL
      : process.env.AI_CHAT_MODEL
    )?.trim() || 'gpt-6-luna'
  if (model !== 'gpt-6-luna' && model !== 'gpt-4.1-mini') {
    throw new Error('Unsupported AI model configuration')
  }
  return model === 'gpt-6-luna'
    ? {
        model,
        reasoning_effort: 'none' as const,
        max_completion_tokens: maxOutputTokens,
        temperature
      }
    : { model, max_tokens: maxOutputTokens, temperature }
}

export function aiProxyUrl(workload: Workload) {
  return (
    (workload === 'chat' ? process.env.AI_CHAT_URL : undefined)?.trim() ||
    process.env.FACE_ANALYSIS_URL?.trim() ||
    'https://openai-secure-proxy.vercel.app/api/chat'
  )
}

// Never turn a refusal, empty reply or truncated output into a paid report.
export function completedAIText(data: unknown): string {
  const choice = (
    data as {
      choices?: {
        finish_reason?: string
        message?: { content?: unknown; refusal?: unknown }
      }[]
    }
  )?.choices?.[0]
  if (
    choice?.finish_reason !== 'stop' ||
    choice.message?.refusal ||
    typeof choice.message?.content !== 'string' ||
    !choice.message.content.trim()
  ) {
    throw new Error('Analysis could not be completed. Please try again.')
  }
  return choice.message.content
}
