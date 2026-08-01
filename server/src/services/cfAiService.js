import config from '../config.js'

const CF_AI_URL = `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run`

const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.1-8b-instruct'
]

export async function cfChatCompletion({ messages, model, temperature = 0.7, max_tokens = 2048 }) {
  let lastError = null
  const modelsToTry = model ? [model] : MODELS

  for (const m of modelsToTry) {
    try {
      const res = await fetch(`${CF_AI_URL}/${m}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.cfApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, max_tokens, temperature })
      })

      const data = await res.json()

      if (!res.ok) {
        lastError = data.errors?.[0]?.message || `HTTP ${res.status}`
        console.error(`CF AI error with model ${m}:`, lastError)
        continue
      }

      const content = data.result?.response || data.result?.choices?.[0]?.message?.content || null
      if (content) return content

      lastError = `Empty response from model ${m}`
    } catch (error) {
      console.error(`CF AI fetch error with model ${m}:`, error.message)
      lastError = error.message
    }
  }

  throw new Error(lastError || 'Todos los modelos de IA fallaron')
}

async function cfCompletionRaw({ messages, tools, model, temperature = 0.7, max_tokens = 2048 }) {
  let lastError = null
  const modelsToTry = model ? [model] : MODELS

  for (const m of modelsToTry) {
    try {
      const body = { messages, max_tokens, temperature }
      if (tools && tools.length > 0) body.tools = tools

      const res = await fetch(`${CF_AI_URL}/${m}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.cfApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        lastError = data.errors?.[0]?.message || `HTTP ${res.status}`
        console.error(`CF AI error with model ${m}:`, lastError)
        continue
      }

      const content = data.result?.response || data.result?.choices?.[0]?.message?.content || null
      const toolCalls = data.result?.tool_calls

      if (content) return { content }
      if (toolCalls && toolCalls.length > 0) return { toolCalls }
      lastError = `Empty response from model ${m}`
    } catch (error) {
      console.error(`CF AI fetch error with model ${m}:`, error.message)
      lastError = error.message
    }
  }

  throw new Error(lastError || 'Todos los modelos de IA fallaron')
}

export async function cfChatWithTools({ messages, tools, model, temperature = 0.7, max_tokens = 2048, executeToolFn, maxIterations = 3 }) {
  const currentMessages = [...messages]
  let iteration = 0

  while (iteration < maxIterations) {
    iteration++

    const result = await cfCompletionRaw({
      messages: currentMessages,
      tools,
      model,
      temperature,
      max_tokens
    })

    if (result.content) {
      return result.content
    }

    if (result.toolCalls && Array.isArray(result.toolCalls)) {
      const toolResults = []

      for (const tc of result.toolCalls) {
        try {
          const toolResult = await executeToolFn(tc.name, tc.arguments || {})
          toolResults.push({ name: tc.name, result: toolResult })
        } catch (e) {
          toolResults.push({ name: tc.name, result: `Error: ${e.message}` })
        }
      }

      currentMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: result.toolCalls
      })

      for (const tr of toolResults) {
        currentMessages.push({
          role: 'tool',
          content: tr.result,
          tool_call_id: tr.name
        })
      }
      continue
    }

    return 'No pude generar una respuesta. Intenta con otra pregunta.'
  }

  return 'El asistente necesita más pasos de los permitidos. Simplifica tu pregunta.'
}
