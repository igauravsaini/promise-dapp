const http = require("http")
const url = require("url")
const UserStorageService = require("./user-storage") // Import the service class

const storage = new UserStorageService() // Instantiate the service
const PORT = 4001 // Admin API will run on a different port

// Define the admin wallet address (replace with your actual admin address)
const ADMIN_WALLET_ADDRESS = "0x84a610d2da45f123be33b64b4c001b25b399ff5c2".toLowerCase() // IMPORTANT: Replace this!

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const path = parsedUrl.pathname
  const method = req.method

  res.setHeader("Access-Control-Allow-Origin", "*") // Allow all origins for development
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Handle preflight requests
  if (method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  // Basic Admin Authentication
  const authHeader = req.headers["authorization"]
  const adminAddress = authHeader ? authHeader.split(" ")[1] : null // Assuming "Bearer 0x..."

  if (!adminAddress || adminAddress.toLowerCase() !== ADMIN_WALLET_ADDRESS) {
    res.writeHead(403, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Forbidden: Admin access required." }))
    return
  }

  console.log(`Admin API Request: ${method} ${path} by ${adminAddress}`)

  try {
    if (path === "/admin/delete-requests" && method === "GET") {
      const requests = await storage.getDeleteRequests()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(requests))
    } else if (path === "/admin/approve-delete" && method === "POST") {
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const { requestId } = JSON.parse(body)
        const updatedRequest = await storage.updateDeleteRequestStatus(requestId, "approved", adminAddress)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(updatedRequest))
      })
    } else if (path === "/admin/reject-delete" && method === "POST") {
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const { requestId } = JSON.parse(body)
        const updatedRequest = await storage.updateDeleteRequestStatus(requestId, "rejected", adminAddress)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(updatedRequest))
      })
    } else if (path === "/admin/stats" && method === "GET") {
      const stats = await storage.getGlobalStats()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(stats))
    } else if (path === "/admin/promises" && method === "GET") {
      // New endpoint to get all promises for admin
      const promises = await storage.getPromises()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(promises))
    } else if (path === "/admin/update-promise-progress" && method === "POST") {
      // New endpoint to update promise progress
      let body = ""
      req.on("data", (chunk) => (body += chunk.toString()))
      req.on("end", async () => {
        const { promiseId, progress } = JSON.parse(body)
        const updatedPromise = await storage.updatePromise(promiseId, { adminAdjustedProgress: progress })
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(updatedPromise))
      })
    } else if (path === "/admin/users" && method === "GET") {
      const users = await storage.getUsers()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(users))
    } else if (path === "/admin/sessions" && method === "GET") {
      const sessions = await storage.getSessions()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(sessions))
    } else {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not Found" }))
    }
  } catch (error) {
    console.error("Admin API Error:", error)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: error.message || "Internal Server Error" }))
  }
})

server.listen(PORT, () => {
  console.log(`🚀 Admin API server running on http://localhost:${PORT}`)
  console.log(`⚠️ IMPORTANT: Admin access requires 'Authorization: Bearer ${ADMIN_WALLET_ADDRESS}' header.`)
  console.log(`Remember to replace '0xYourAdminWalletAddressHere' in admin-api.js with a real admin address!`)
})
