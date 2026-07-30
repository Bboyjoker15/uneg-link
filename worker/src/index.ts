import { DurableObject } from "cloudflare:workers"

interface Env {
  AI: Ai
  CHAT_ROOM: DurableObjectNamespace<ChatRoom>
  TURSO_URL: string
  TURSO_TOKEN?: string
}

const SYSTEM_PROMPT = `Eres UnegAI, asistente académico de Uneg-Link. Respondes preguntas académicas y consultas datos reales de la plataforma usando herramientas. NO inventes fechas ni datos. Sé formal y didáctico.`

const TOOLS = [
  {
    name: "get_events",
    description: "Obtiene eventos del calendario de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  },
  {
    name: "get_files",
    description: "Lista archivos y materiales de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  },
  {
    name: "get_announcements",
    description: "Obtiene anuncios recientes de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  },
  {
    name: "get_assignments",
    description: "Lista tareas de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  },
  {
    name: "get_quizzes",
    description: "Lista quizzes de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  },
  {
    name: "get_professor",
    description: "Información del profesor de la materia",
    parameters: { type: "object", properties: { sectionSubjectId: { type: "string" } }, required: ["sectionSubjectId"] }
  }
]

export class ChatRoom extends DurableObject<Env> {
  private sessions: Map<WebSocket, { userId: string; userName: string }>

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sessions = new Map()
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // WebSocket upgrade for chat
    if (url.pathname.endsWith("/ws")) {
      const userId = url.searchParams.get("userId") || "anon"
      const userName = url.searchParams.get("userName") || "User"
      
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      
      this.ctx.acceptWebSocket(server)
      this.sessions.set(server, { userId, userName })
      
      // Broadcast join
      this.broadcast({ type: "join", userId, userName, count: this.sessions.size })
      
      return new Response(null, { status: 101, webSocket: client })
    }
    
    // HTTP endpoint for AI chat (fallback)
    if (url.pathname === "/ai" && request.method === "POST") {
      return this.handleAIRequest(request)
    }
    
    return new Response("Not found", { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    const session = this.sessions.get(ws)
    if (!session) return

    const msg = JSON.parse(message) as any
    const { type, text, sectionSubjectId, channelName } = msg

    // AI mode
    if (type === "ai" || msg.mode === "ai" || msg.mode === "ia") {
      // Tell client we're thinking
      this.sendTo(ws, { type: "thinking", userId: "ai" })

      const response = await this.callAI(text || "Hola", sectionSubjectId)
      
      // Save AI message to SQLite
      this.ctx.storage.sql.exec(
        "INSERT INTO messages (channel_id, user_id, user_name, content, is_ai, created_at) VALUES (?, ?, ?, ?, 1, ?)",
        this.ctx.id.toString(), "ai", "UnegAI", response, Date.now()
      )

      // Broadcast AI response
      this.broadcast({ type: "ai_response", userId: "ai", userName: "UnegAI", content: response, isAI: true })
      
      // Tell client done
      this.sendTo(ws, { type: "done" })
      return
    }

    // Regular message
    // Persist
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (channel_id, user_id, user_name, content, is_ai, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      this.ctx.id.toString(), session.userId, session.userName, text, Date.now()
    )

    // Broadcast
    this.broadcast({ type: "message", userId: session.userId, userName: session.userName, content: text, channelName })

    // Typing stop
    this.broadcast({ type: "stop_typing", userId: session.userId }, ws)
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const session = this.sessions.get(ws)
    this.sessions.delete(ws)
    if (session) {
      this.broadcast({ type: "leave", userId: session.userId, userName: session.userName, count: this.sessions.size })
    }
  }

  async webSocketError(ws: WebSocket, error: Error) {
    this.sessions.delete(ws)
  }

  private sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  private broadcast(data: any, exclude?: WebSocket) {
    for (const ws of this.sessions.keys()) {
      if (ws !== exclude) this.sendTo(ws, data)
    }
  }

  private async callAI(question: string, sectionSubjectId?: string): Promise<string> {
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ]
    
    if (sectionSubjectId) {
      messages.push({ role: "system", content: `El ID de la materia actual es: ${sectionSubjectId}` })
    }
    
    messages.push({ role: "user", content: question })

    try {
      let result = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages,
        max_tokens: 2048,
        temperature: 0.7
      }) as any

      let content = result?.response || result?.choices?.[0]?.message?.content || null

      return content || "No pude generar una respuesta."
    } catch (e: any) {
      console.error("AI error:", e.message, JSON.stringify(e))
      return `Error al procesar la consulta: ${e.message}`
    }
  }

  private async executeTursoTool(name: string, args: any): Promise<string> {
    if (!this.env.TURSO_TOKEN) return "Error: TURSO_TOKEN no configurado"
    const ssId = args.sectionSubjectId
    if (!ssId) return "Error: sectionSubjectId requerido"

    let sql = ""
    let queryArgs: any[] = [ssId]
    const now = Date.now()
    
    switch (name) {
      case "get_events":
        sql = `SELECT titulo, descripcion, fecha, tipo, importante FROM CalendarEvent WHERE sectionSubjectId = ? AND fecha >= ? ORDER BY fecha ASC`
        queryArgs = [ssId, now]
        break
      case "get_files":
        sql = `SELECT nombre, tipo, createdAt FROM File WHERE sectionSubjectId = ? ORDER BY createdAt DESC`
        break
      case "get_announcements":
        sql = `SELECT m.contenido, m.createdAt, u.nombre as author FROM Message m JOIN User u ON m.userId = u.id JOIN Channel c ON m.channelId = c.id WHERE c.sectionSubjectId = ? AND c.nombre = 'Anuncios' ORDER BY m.createdAt DESC LIMIT 10`
        break
      case "get_assignments":
        sql = `SELECT a.titulo, a.descripcion, a.fechaLimite, (SELECT COUNT(*) FROM AssignmentSubmission WHERE assignmentId = a.id) as entregas FROM Assignment a WHERE a.sectionSubjectId = ? ORDER BY a.createdAt DESC`
        break
      case "get_quizzes":
        sql = `SELECT titulo, descripcion, maxAttempts, timeLimit FROM Quiz WHERE sectionSubjectId = ? ORDER BY createdAt DESC`
        break
      case "get_professor":
        sql = `SELECT u.nombre, u.email, s.nombre as subject, sec.codigo as section FROM SectionSubject ss JOIN User u ON ss.profesorId = u.id JOIN Subject s ON ss.subjectId = s.id JOIN Section sec ON ss.sectionId = sec.id WHERE ss.id = ?`
        break
      default:
        return `Herramienta desconocida: ${name}`
    }

    // Wrap args with types for Turso
    const typedArgs = queryArgs.map(a => {
      if (typeof a === 'number') return { type: "integer", value: String(a) }
      return { type: "text", value: String(a) }
    })

    try {
      const res = await fetch(`${this.env.TURSO_URL}/v2/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.TURSO_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql, args: typedArgs } }] })
      })
      const data = await res.json() as any
      const result = data.results?.[0]?.response?.result

      if (!result?.rows?.length) return "No se encontraron datos"

      const cols = result.cols || []
      const rows = result.rows.map((row: any[]) => {
        const obj: any = {}
        cols.forEach((col: any, i: number) => { obj[col.name] = row[i] })
        return obj
      })

      // Format based on tool
      if (name === "get_events") {
        return rows.map((r: any) => `• ${r.titulo} — ${new Date(r.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${r.tipo})${r.importante ? ' ⭐' : ''}${r.descripcion ? ' — ' + r.descripcion : ''}`).join('\n')
      }
      if (name === "get_files") {
        return rows.map((r: any) => `• ${r.nombre} (${r.tipo}) — ${new Date(r.createdAt).toLocaleDateString('es-ES')}`).join('\n')
      }
      if (name === "get_announcements") {
        return rows.map((r: any) => `• ${r.author}: "${(r.contenido || '').slice(0, 150)}" — ${new Date(r.createdAt).toLocaleDateString('es-ES')}`).join('\n')
      }
      if (name === "get_assignments") {
        return rows.map((r: any) => `• ${r.titulo}${r.fechaLimite ? ' — Entrega: ' + new Date(r.fechaLimite).toLocaleDateString('es-ES') : ''} (${r.entregas} entregas)${r.descripcion ? '\n  ' + r.descripcion : ''}`).join('\n')
      }
      if (name === "get_quizzes") {
        return rows.map((r: any) => `• ${r.titulo}${r.descripcion ? ': ' + r.descripcion : ''} — ${r.maxAttempts} intentos${r.timeLimit ? ', ' + r.timeLimit + ' min' : ''}`).join('\n')
      }
      if (name === "get_professor") {
        const r = rows[0]
        return `Prof. ${r.nombre} — ${r.subject} ${r.section}${r.email ? ' — ' + r.email : ''}`
      }
      return JSON.stringify(rows)
    } catch (e: any) {
      return `Error: ${e.message}`
    }
  }

  private async handleAIRequest(request: Request): Promise<Response> {
    const body = await request.json() as any
    const response = await this.callAI(body.question, body.sectionSubjectId)
    return Response.json({ content: response })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "Uneg Chat Worker" })
    }

    // Route WebSocket to the appropriate channel DO
    if (url.pathname.endsWith("/ws") || url.pathname.startsWith("/chat/")) {
      const channelId = url.searchParams.get("channelId") || url.pathname.split("/").pop() || "default"
      
      const doId = env.CHAT_ROOM.idFromName(channelId)
      const stub = env.CHAT_ROOM.get(doId)
      
      // Rewrite URL to /ws for the DO
      const newUrl = new URL(request.url)
      newUrl.pathname = "/ws"
      return stub.fetch(new Request(newUrl, request))
    }

    // HTTP AI endpoint
    if (url.pathname === "/ai" && request.method === "POST") {
      const channelId = "ai-chat"
      const doId = env.CHAT_ROOM.idFromName(channelId)
      const stub = env.CHAT_ROOM.get(doId)
      return stub.fetch(request)
    }

    return Response.json({ 
      status: "ok",
      endpoints: ["/health", "/chat/{channelId}/ws", "/ai"]
    })
  }
}
