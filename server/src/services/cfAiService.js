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
