"use client"

interface Promise {
  id: string
  address: string
  message: string
  deadline: number
  status: "active" | "completed" | "failed"
  proof?: string
  createdAt: number
  category: string
  difficulty: "easy" | "medium" | "hard"
  adminAdjustedProgress?: number // New field for admin control
}

interface UserStats {
  reputation: number
  completedPromises: number
  failedPromises: number
  totalPromises: number
  streak: number
  level: number
}

interface GlobalStats {
  totalUsers: number
  totalPromises: number
  completionRate: number
  averageReputation: number
  topPerformer: string | null
}

interface DeleteRequest {
  id: string
  promiseId: string
  requesterAddress: string
  status: "pending" | "approved" | "rejected"
  requestedAt: number
}

const BACKEND_API_URL = "http://localhost:4000" // Main backend API port
const ADMIN_API_URL = "http://localhost:4001/admin" // Admin API port

export class RealtimeService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private sessionId: string | null = null

  private promiseUpdateCallbacks: ((promise: Promise) => void)[] = []
  private newPromiseCallbacks: ((promise: Promise) => void)[] = []
  private promiseDeleteCallbacks: ((promiseId: string) => void)[] = []
  private statsUpdateCallbacks: ((stats: GlobalStats) => void)[] = []
  private deleteRequestCallbacks: ((request: DeleteRequest) => void)[] = []

  constructor() {
    // No initial stats broadcast here, as they will be fetched from backend
  }

  async connect(sessionId: string) {
    this.sessionId = sessionId
    try {
      console.log("🔗 Attempting to connect to backend and record session...")
      const response = await fetch(`${BACKEND_API_URL}/record-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend responded with status ${response.status}: ${errorText}`)
      }

      console.log("✅ Connected to real-time service and session recorded")

      const currentStats = await this.getGlobalStats()
      this.statsUpdateCallbacks.forEach((callback) => callback(currentStats))
    } catch (error) {
      console.error("❌ Failed to connect to real-time service or record session:", error)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.error(
          "💡 Hint: This often means the main backend server (main-backend-server.js) is not running. Please ensure you've run 'npm run backend:dev' in your terminal.",
        )
      }
      this.handleReconnect()
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    console.log("🔌 Disconnected from real-time service")
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        if (this.sessionId) {
          this.connect(this.sessionId)
        }
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  async getInitialPromises(): Promise<Promise[]> {
    try {
      const response = await fetch(`${BACKEND_API_URL}/promises`)
      if (!response.ok) throw new Error("Failed to fetch promises")
      return await response.json()
    } catch (error) {
      console.error("Error fetching initial promises:", error)
      return []
    }
  }

  async getUserStats(address: string): Promise<UserStats> {
    try {
      const response = await fetch(`${BACKEND_API_URL}/users/${address}`)
      if (!response.ok) throw new Error("Failed to fetch user stats")
      return await response.json()
    } catch (error) {
      console.error("Error fetching user stats:", error)
      return { reputation: 0, completedPromises: 0, failedPromises: 0, totalPromises: 0, streak: 0, level: 1 }
    }
  }

  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const response = await fetch(`${BACKEND_API_URL}/global-stats`)
      if (!response.ok) throw new Error("Failed to fetch global stats")
      return await response.json()
    } catch (error) {
      console.error("Error fetching global stats:", error)
      return { totalUsers: 0, totalPromises: 0, completionRate: 0, averageReputation: 0, topPerformer: null }
    }
  }

  async createPromise(promise: Promise): Promise<Promise> {
    // Changed return type to Promise
    console.log("🚀 Creating promise:", promise.message)
    try {
      const response = await fetch(`${BACKEND_API_URL}/promises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promise),
      })
      if (!response.ok) throw new Error("Failed to create promise")
      const newPromise = await response.json()
      this.newPromiseCallbacks.forEach((callback) => callback(newPromise))
      const updatedStats = await this.getGlobalStats()
      this.statsUpdateCallbacks.forEach((callback) => callback(updatedStats))
      console.log("✅ Promise created successfully (via backend)")
      return newPromise // Return the promise with the backend-generated ID
    } catch (error) {
      console.error("Error creating promise:", error)
      throw error
    }
  }

  async updatePromiseStatus(
    promiseId: string,
    status: "completed" | "failed",
    proof?: string,
    updaterAddress?: string,
  ): Promise<Promise> {
    // Changed return type to Promise
    console.log(`📝 Updating promise ${promiseId} to ${status}`)
    try {
      const response = await fetch(`${BACKEND_API_URL}/promises/${promiseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, proof, updaterAddress }),
      })
      if (!response.ok) throw new Error("Failed to update promise status")
      const updatedPromise = await response.json()
      this.promiseUpdateCallbacks.forEach((callback) => callback(updatedPromise))
      const updatedStats = await this.getGlobalStats()
      this.statsUpdateCallbacks.forEach((callback) => callback(updatedStats))
      console.log("✅ Promise status updated successfully (via backend)")
      return updatedPromise // Return the updated promise
    } catch (error) {
      console.error("Error updating promise status:", error)
      throw error
    }
  }

  async requestDeletePromise(promiseId: string, requesterAddress: string): Promise<void> {
    console.log(`🗑️ Requesting deletion for promise ${promiseId} by ${requesterAddress}`)
    try {
      const response = await fetch(`${BACKEND_API_URL}/delete-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promiseId, requesterAddress }),
      })
      if (!response.ok) throw new Error("Failed to send delete request")
      const newRequest = await response.json()
      this.deleteRequestCallbacks.forEach((callback) => callback(newRequest))
      console.log("✅ Delete request sent successfully (via backend)")
    } catch (error) {
      console.error("Error sending delete request:", error)
      throw error
    }
  }

  async getAdminDeleteRequests(adminAddress: string): Promise<DeleteRequest[]> {
    try {
      const response = await fetch(`${ADMIN_API_URL}/delete-requests`, {
        headers: { Authorization: `Bearer ${adminAddress}` },
      })
      if (!response.ok) throw new Error("Failed to fetch admin delete requests")
      return await response.json()
    } catch (error) {
      console.error("Error fetching admin delete requests:", error)
      throw error
    }
  }

  async approveDeleteRequest(requestId: string, adminAddress: string): Promise<string> {
    // Changed return type to string (promiseId)
    console.log(`✅ Admin ${adminAddress} approving delete request ${requestId}`)
    try {
      const response = await fetch(`${ADMIN_API_URL}/approve-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminAddress}` },
        body: JSON.stringify({ requestId }),
      })
      if (!response.ok) throw new Error("Failed to approve delete request")
      const result = await response.json()
      // The backend's updateDeleteRequestStatus now returns the request object,
      // which includes the promiseId. We need to return that promiseId.
      const deletedPromiseId = result.promiseId
      this.promiseDeleteCallbacks.forEach((callback) => callback(deletedPromiseId))
      const updatedStats = await this.getGlobalStats()
      this.statsUpdateCallbacks.forEach((callback) => callback(updatedStats))
      console.log(`✅ Promise deleted by admin (via backend)`)
      return deletedPromiseId // Return the ID of the deleted promise
    } catch (error) {
      console.error("Error approving request:", error)
      throw error
    }
  }

  async rejectDeleteRequest(requestId: string, adminAddress: string): Promise<void> {
    console.log(`❌ Admin ${adminAddress} rejecting delete request ${requestId}`)
    try {
      const response = await fetch(`${ADMIN_API_URL}/reject-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminAddress}` },
        body: JSON.stringify({ requestId }),
      })
      if (!response.ok) throw new Error("Failed to reject delete request")
      console.log(`❌ Delete request rejected by admin (via backend)`)
    } catch (error) {
      console.error("Error rejecting request:", error)
      throw error
    }
  }

  async getAllUsers(adminAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${ADMIN_API_URL}/users`, {
        headers: { Authorization: `Bearer ${adminAddress}` },
      })
      if (!response.ok) throw new Error("Failed to fetch all users")
      return Object.values(await response.json())
    } catch (error) {
      console.error("Error fetching all users:", error)
      throw error
    }
  }

  async getAllSessions(adminAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`${ADMIN_API_URL}/sessions`, {
        headers: { Authorization: `Bearer ${adminAddress}` },
      })
      if (!response.ok) throw new Error("Failed to fetch all sessions")
      return Object.values(await response.json())
    } catch (error) {
      console.error("Error fetching all sessions:", error)
      throw error
    }
  }

  async getAllPromises(adminAddress: string): Promise<Promise[]> {
    try {
      const response = await fetch(`${ADMIN_API_URL}/promises`, {
        headers: { Authorization: `Bearer ${adminAddress}` },
      })
      if (!response.ok) throw new Error("Failed to fetch all promises for admin")
      return await response.json()
    } catch (error) {
      console.error("Error fetching all promises for admin:", error)
      throw error
    }
  }

  async updateAdminPromiseProgress(promiseId: string, progress: number, adminAddress: string): Promise<Promise> {
    console.log(`📈 Admin ${adminAddress} updating progress for promise ${promiseId} to ${progress}%`)
    try {
      const response = await fetch(`${ADMIN_API_URL}/update-promise-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminAddress}` },
        body: JSON.stringify({ promiseId, progress }),
      })
      if (!response.ok) throw new Error("Failed to update promise progress")
      const updatedPromise = await response.json()
      this.promiseUpdateCallbacks.forEach((callback) => callback(updatedPromise)) // Notify listeners
      console.log(`✅ Promise progress updated by admin (via backend)`)
      return updatedPromise
    } catch (error) {
      console.error("Error updating promise progress:", error)
      throw error
    }
  }

  onPromiseUpdate(callback: (promise: Promise) => void) {
    this.promiseUpdateCallbacks.push(callback)
  }

  onNewPromise(callback: (promise: Promise) => void) {
    this.newPromiseCallbacks.push(callback)
  }

  onPromiseDelete(callback: (promiseId: string) => void) {
    this.promiseDeleteCallbacks.push(callback)
  }

  onStatsUpdate(callback: (stats: GlobalStats) => void) {
    this.statsUpdateCallbacks.push(callback)
  }

  onDeleteRequest(callback: (request: DeleteRequest) => void) {
    this.deleteRequestCallbacks.push(callback)
  }
}
