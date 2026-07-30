import config from '../config.js'

const CF_AI_URL = `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run`

const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.1-8b-instruct'
]

export async function cfChatCompletion({ messages, model, temperature = 0.7, max_tokens = 2048, tools }) {
  let lastError = null

  const modelsToTry = model ? [model] : MODELS

  for (const m of modelsToTry) {
    try {
      const body = { messages, max_tokens, temperature }
      if (tools?.length) body.tools = tools

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

      return data.result
    } catch (error) {
      console.error(`CF AI fetch error with model ${m}:`, error.message)
      lastError = error.message
    }
  }

  throw new Error(lastError || 'Todos los modelos de IA fallaron')
}

export async function cfChatWithTools({ messages, tools, temperature = 0.7, max_tokens = 2048 }) {
  const result = await cfChatCompletion({ messages, tools, temperature, max_tokens })

  // CF format: result.response or OpenAI format: result.choices[0]
  const choice = result?.choices?.[0] || result
  const content = result?.response || choice?.message?.content || null
  const toolCalls = result?.tool_calls || choice?.message?.tool_calls || null

  return { content, toolCalls, raw: result }
}
