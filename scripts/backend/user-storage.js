const fs = require("fs").promises
const path = require("path")

class UserStorageService {
  constructor() {
    this.dataDir = path.join(__dirname, "data")
    this.usersFile = path.join(this.dataDir, "users.json")
    this.promisesFile = path.join(this.dataDir, "promises.json")
    this.statsFile = path.join(this.dataDir, "global-stats.json")
    this.deleteRequestsFile = path.join(this.dataDir, "delete-requests.json")
    this.sessionsFile = path.join(this.dataDir, "sessions.json")

    this.initializeStorage()
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })

      await this.initializeFile(this.usersFile, {})
      // REMOVED: Initial mock promises to ensure permanent deletion
      await this.initializeFile(this.promisesFile, [])
      await this.initializeFile(this.statsFile, {
        totalUsers: 0,
        totalPromises: 0,
        completionRate: 0,
        averageReputation: 0,
        topPerformer: null,
      })
      await this.initializeFile(this.deleteRequestsFile, [])
      await this.initializeFile(this.sessionsFile, {})

      console.log("✅ User storage system initialized")
      await this.updateGlobalStats() // Ensure initial stats are calculated based on initial data
    } catch (error) {
      console.error("❌ Failed to initialize storage:", error)
    }
  }

  async initializeFile(filePath, defaultData) {
    try {
      await fs.access(filePath)
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2))
    }
  }

  // Session/IP Tracking
  async recordSession(sessionId, ipAddress = "simulated_ip") {
    try {
      const sessions = await this.getSessions()
      if (!sessions[sessionId]) {
        sessions[sessionId] = { ip: ipAddress, firstVisit: Date.now(), lastActive: Date.now() }
        await this.saveSessions(sessions)
        await this.updateGlobalStats()
        console.log(`🌐 New session recorded: ${sessionId} from IP: ${ipAddress}`)
      } else {
        sessions[sessionId].lastActive = Date.now()
        await this.saveSessions(sessions)
      }
    } catch (error) {
      console.error("❌ Failed to record session:", error)
    }
  }

  async getSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, "utf8")
      return JSON.parse(data)
    } catch (error) {
      console.error("❌ Failed to read sessions:", error)
      return {}
    }
  }

  async saveSessions(sessions) {
    try {
      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2))
    } catch (error) {
      console.error("❌ Failed to save sessions:", error)
      throw error
    }
  }

  // User Management
  async createUser(address, userData = {}) {
    try {
      const users = await this.getUsers()

      const newUser = {
        address,
        reputation: 0,
        completedPromises: 0,
        failedPromises: 0,
        totalPromises: 0,
        streak: 0,
        level: 1,
        joinedAt: Date.now(),
        lastActive: Date.now(),
        ...userData,
      }

      users[address.toLowerCase()] = newUser
      await this.saveUsers(users)
      await this.updateGlobalStats()

      console.log(`👤 Created user: ${address}`)
      return newUser
    } catch (error) {
      console.error("❌ Failed to create user:", error)
      throw error
    }
  }

  async getUser(address) {
    try {
      const users = await this.getUsers()
      return users[address.toLowerCase()] || null
    } catch (error) {
      console.error("❌ Failed to get user:", error)
      return null
    }
  }

  async updateUser(address, updates) {
    try {
      const users = await this.getUsers()

      if (!users[address.toLowerCase()]) {
        throw new Error(`User ${address} not found`)
      }

      users[address.toLowerCase()] = {
        ...users[address.toLowerCase()],
        ...updates,
        lastActive: Date.now(),
      }

      await this.saveUsers(users)
      console.log(`📝 Updated user: ${address}`)
      return users[address.toLowerCase()]
    } catch (error) {
      console.error("❌ Failed to update user:", error)
      throw error
    }
  }

  async getUsers() {
    try {
      const data = await fs.readFile(this.usersFile, "utf8")
      return JSON.parse(data)
    } catch (error) {
      console.error("❌ Failed to read users:", error)
      return {}
    }
  }

  async saveUsers(users) {
    try {
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2))
    } catch (error) {
      console.error("❌ Failed to save users:", error)
      throw error
    }
  }

  // Promise Management
  async createPromise(promiseData) {
    try {
      const promises = await this.getPromises()
      let user = await this.getUser(promiseData.address)

      if (!user) {
        user = await this.createUser(promiseData.address)
      }

      const newPromise = {
        id: `promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        adminAdjustedProgress: undefined, // Initialize new field
        ...promiseData,
      }

      promises.push(newPromise)
      await this.savePromises(promises)

      await this.updateUser(promiseData.address, {
        totalPromises: user.totalPromises + 1,
      })

      await this.updateGlobalStats()

      console.log(`🎯 Created promise: ${newPromise.id}`)
      return newPromise
    } catch (error) {
      console.error("❌ Failed to create promise:", error)
      throw error
    }
  }

  async updatePromise(promiseId, updates) {
    try {
      const promises = await this.getPromises()
      const promiseIndex = promises.findIndex((p) => p.id === promiseId)

      if (promiseIndex === -1) {
        throw new Error(`Promise ${promiseId} not found`)
      }

      const oldPromise = promises[promiseIndex]
      promises[promiseIndex] = {
        ...oldPromise,
        ...updates,
        updatedAt: Date.now(),
      }

      await this.savePromises(promises)

      if (updates.status && updates.status !== oldPromise.status) {
        await this.updateUserReputation(oldPromise.address, updates.status)
      }

      await this.updateGlobalStats()

      console.log(`📝 Updated promise: ${promiseId}`)
      return promises[promiseIndex]
    } catch (error) {
      console.error("❌ Failed to update promise:", error)
      throw error
    }
  }

  async deletePromise(promiseId) {
    try {
      let promises = await this.getPromises()
      const promiseToDelete = promises.find((p) => p.id === promiseId)

      if (!promiseToDelete) {
        throw new Error(`Promise ${promiseId} not found`)
      }

      promises = promises.filter((p) => p.id !== promiseId)
      await this.savePromises(promises)

      const user = await this.getUser(promiseToDelete.address)
      if (user) {
        await this.updateUser(promiseToDelete.address, {
          totalPromises: Math.max(0, user.totalPromises - 1),
        })
      }

      await this.updateGlobalStats()

      console.log(`🗑️ Deleted promise: ${promiseId}`)
      return { success: true }
    } catch (error) {
      console.error("❌ Failed to delete promise:", error)
      throw error
    }
  }

  async getPromises(filter = {}) {
    try {
      const data = await fs.readFile(this.promisesFile, "utf8")
      let promises = JSON.parse(data)

      if (filter.address) {
        promises = promises.filter((p) => p.address.toLowerCase() === filter.address.toLowerCase())
      }

      if (filter.status) {
        promises = promises.filter((p) => p.status === filter.status)
      }

      if (filter.category) {
        promises = promises.filter((p) => p.category === filter.category)
      }

      return promises
    } catch (error) {
      console.error("❌ Failed to read promises:", error)
      return []
    }
  }

  async savePromises(promises) {
    try {
      await fs.writeFile(this.promisesFile, JSON.stringify(promises, null, 2))
    } catch (error) {
      console.error("❌ Failed to save promises:", error)
      throw error
    }
  }

  async updateUserReputation(address, status) {
    try {
      const user = await this.getUser(address)
      if (!user) return

      let reputationChange = 0
      const updates = {}

      if (status === "completed") {
        reputationChange = 10
        updates.completedPromises = user.completedPromises + 1
        updates.streak = user.streak + 1
      } else if (status === "failed") {
        reputationChange = -5
        updates.failedPromises = user.failedPromises + 1
        updates.streak = 0
      }

      updates.reputation = Math.max(0, user.reputation + reputationChange)
      updates.level = Math.floor(updates.reputation / 50) + 1

      await this.updateUser(address, updates)

      console.log(`📊 Updated reputation for ${address}: ${reputationChange > 0 ? "+" : ""}${reputationChange}`)
    } catch (error) {
      console.error("❌ Failed to update user reputation:", error)
    }
  }

  // Global Statistics
  async updateGlobalStats() {
    try {
      const users = await this.getUsers()
      const promises = await this.getPromises()
      const sessions = await this.getSessions()

      const userArray = Object.values(users)
      const totalUsers = Object.keys(sessions).length
      const totalPromises = promises.length

      const completedPromises = promises.filter((p) => p.status === "completed").length
      const completionRate = totalPromises > 0 ? (completedPromises / totalPromises) * 100 : 0

      const totalReputation = userArray.reduce((sum, user) => sum + user.reputation, 0)
      const averageReputation = totalUsers > 0 ? totalReputation / totalUsers : 0

      const topPerformer = userArray.reduce(
        (top, user) => (user.reputation > (top?.reputation || 0) ? user : top),
        null,
      )

      const stats = {
        totalUsers,
        totalPromises,
        completionRate: Number.parseFloat(completionRate.toFixed(9)),
        averageReputation: Number.parseFloat(averageReputation.toFixed(9)),
        topPerformer: topPerformer?.address || null,
        lastUpdated: Date.now(),
      }

      await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2))
      console.log("📈 Updated global statistics")

      return stats
    } catch (error) {
      console.error("❌ Failed to update global stats:", error)
      throw error
    }
  }

  async getGlobalStats() {
    try {
      const data = await fs.readFile(this.statsFile, "utf8")
      return JSON.parse(data)
    } catch (error) {
      console.error("❌ Failed to read global stats:", error)
      return null
    }
  }

  // Delete Request Management
  async addDeleteRequest(promiseId, requesterAddress) {
    try {
      const requests = await this.getDeleteRequests(true)
      const existingRequest = requests.find((req) => req.promiseId === promiseId && req.status === "pending")

      if (existingRequest) {
        console.log(`⚠️ Delete request for promise ${promiseId} already pending.`)
        return existingRequest
      }

      const newRequest = {
        id: `delreq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        promiseId,
        requesterAddress,
        status: "pending",
        requestedAt: Date.now(),
      }
      requests.push(newRequest)
      await this.saveDeleteRequests(requests)
      console.log(`🗑️ Added delete request for promise ${promiseId} by ${requesterAddress}`)
      return newRequest
    } catch (error) {
      console.error("❌ Failed to add delete request:", error)
      throw error
    }
  }

  async getDeleteRequests(includeAll = false) {
    try {
      const data = await fs.readFile(this.deleteRequestsFile, "utf8")
      const requests = JSON.parse(data)
      return includeAll ? requests : requests.filter((req) => req.status === "pending")
    } catch (error) {
      console.error("❌ Failed to read delete requests:", error)
      return []
    }
  }

  async updateDeleteRequestStatus(requestId, status, adminAddress) {
    try {
      const requests = await this.getDeleteRequests(true)
      const requestIndex = requests.findIndex((req) => req.id === requestId)

      if (requestIndex === -1) {
        throw new Error(`Delete request ${requestId} not found.`)
      }

      requests[requestIndex].status = status
      requests[requestIndex].processedBy = adminAddress
      requests[requestIndex].processedAt = Date.now()

      await this.saveDeleteRequests(requests)
      console.log(`📝 Updated delete request ${requestId} to ${status} by ${adminAddress}`)

      if (status === "approved") {
        await this.deletePromise(requests[requestIndex].promiseId)
      }
      return requests[requestIndex]
    } catch (error) {
      console.error("❌ Failed to update delete request status:", error)
      throw error
    }
  }

  async saveDeleteRequests(requests) {
    try {
      await fs.writeFile(this.deleteRequestsFile, JSON.stringify(requests, null, 2))
    } catch (error) {
      console.error("❌ Failed to save delete requests:", error)
      throw error
    }
  }

  // Leaderboard
  async getLeaderboard(limit = 10) {
    try {
      const users = await this.getUsers()
      const userArray = Object.values(users)

      return userArray
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, limit)
        .map((user) => ({
          address: user.address,
          reputation: user.reputation,
          completedPromises: user.completedPromises,
          level: user.level,
          streak: user.streak,
        }))
    } catch (error) {
      console.error("❌ Failed to get leaderboard:", error)
      return []
    }
  }

  // Data Export/Import
  async exportUserData(address) {
    try {
      const user = await this.getUser(address)
      const promises = await this.getPromises({ address })

      return {
        user,
        promises,
        exportedAt: Date.now(),
      }
    } catch (error) {
      console.error("❌ Failed to export user data:", error)
      throw error
    }
  }

  async backupData() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const backupDir = path.join(this.dataDir, "backups")

      await fs.mkdir(backupDir, { recursive: true })

      const users = await this.getUsers()
      const promises = await this.getPromises()
      const stats = await this.getGlobalStats()
      const deleteRequests = await this.getDeleteRequests(true)
      const sessions = await this.getSessions()

      const backup = {
        users,
        promises,
        stats,
        deleteRequests,
        sessions,
        backedUpAt: Date.now(),
      }

      const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2))

      console.log(`💾 Data backed up to: ${backupFile}`)
      return backupFile
    } catch (error) {
      console.error("❌ Failed to backup data:", error)
      throw error
    }
  }
}

module.exports = UserStorageService
