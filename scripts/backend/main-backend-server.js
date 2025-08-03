const http = require("http")
const url = require("url")
const UserStorageService = require("./user-storage") // Import the service class

const storage = new UserStorageService()
const PORT = 4000 // Main backend API port

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const path = parsedUrl.pathname
  const method = req.method

  res.setHeader("Access-Control-Allow-Origin", "*") // Allow all origins for development
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (path === "/record-session" && method === "POST") {
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const { sessionId } = JSON.parse(body)
        await storage.recordSession(sessionId, req.socket.remoteAddress || "simulated_ip")
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: true }))
      })
    } else if (path === "/promises" && method === "GET") {
      const promises = await storage.getPromises()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(promises))
    } else if (path === "/promises" && method === "POST") {
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const promiseData = JSON.parse(body)
        const newPromise = await storage.createPromise(promiseData)
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify(newPromise))
      })
    } else if (path.startsWith("/promises/") && method === "PUT") {
      const promiseId = path.split("/")[2]
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const updates = JSON.parse(body)
        const updatedPromise = await storage.updatePromise(promiseId, updates)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(updatedPromise))
      })
    } else if (path.startsWith("/users/") && method === "GET") {
      const address = path.split("/")[2]
      const user = await storage.getUser(address)
      if (user) {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(user))
      } else {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "User not found" }))
      }
    } else if (path === "/global-stats" && method === "GET") {
      const stats = await storage.getGlobalStats()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(stats))
    } else if (path === "/delete-requests" && method === "POST") {
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const { promiseId, requesterAddress } = JSON.parse(body)
        const newRequest = await storage.addDeleteRequest(promiseId, requesterAddress)
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify(newRequest))
      })
    } else {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not Found" }))
    }
  } catch (error) {
    console.error("Backend API Error:", error)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: error.message || "Internal Server Error" }))
  }
})

server.listen(PORT, () => {
  console.log(`🚀 Main Backend Storage API server running on http://localhost:${PORT}`)
})
