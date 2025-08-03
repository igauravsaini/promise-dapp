"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Users,
  TrendingUp,
  Award,
  Target,
  Zap,
  Star,
  Trash2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Toaster, toast } from "sonner"
import { MetaMaskConnector } from "@/components/metamask-connector"
import { RealtimeService } from "@/lib/realtime-service"
import Link from "next/link" // Import Link for navigation

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

interface User {
  address: string
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

export default function PublicPromiseRegistry() {
  const [promises, setPromises] = useState<Promise[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [filter, setFilter] = useState<"all" | "my" | "active" | "completed" | "failed">("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [realtimeService] = useState(() => new RealtimeService())

  // Generate a unique session ID for "IP tracking" simulation
  // This effect ensures localStorage is only accessed on the client side
  const sessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (typeof window !== "undefined" && !sessionIdRef.current) {
      sessionIdRef.current = localStorage.getItem("sessionId")
      if (!sessionIdRef.current) {
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem("sessionId", sessionIdRef.current)
      }
    }
  }, [])

  // Initialize real-time service and fetch initial data
  useEffect(() => {
    if (!sessionIdRef.current) return // Ensure sessionId is set before connecting

    realtimeService.connect(sessionIdRef.current) // Pass session ID on connect

    // Listen for real-time updates
    realtimeService.onPromiseUpdate((updatedPromise) => {
      setPromises((prev) => prev.map((p) => (p.id === updatedPromise.id ? updatedPromise : p)))
      toast.success("Promise Updated", { description: "A promise was updated in real-time!" })
    })

    realtimeService.onNewPromise((newPromise) => {
      setPromises((prev) => {
        // Prevent duplicate if already exists
        if (prev.some((p) => p.id === newPromise.id)) {
          return prev
        }
        return [newPromise, ...prev]
      })
      toast.info("New Promise Created", { description: "Someone just created a new promise!" })
    })

    realtimeService.onPromiseDelete((deletedPromiseId) => {
      setPromises((prev) => prev.filter((p) => p.id !== deletedPromiseId))
      toast.info("Promise Deleted", { description: "A promise was removed from the registry by admin." })
    })

    realtimeService.onStatsUpdate((stats) => {
      setGlobalStats(stats)
    })

    // Fetch initial promises and global stats from backend (simulated)
    const fetchInitialData = async () => {
      const initialPromises = await realtimeService.getInitialPromises()
      setPromises(initialPromises)
      const initialGlobalStats = await realtimeService.getGlobalStats() // Fetch initial global stats from backend
      setGlobalStats(initialGlobalStats)

      // Simulate fetching user data if wallet is already connected
      if (isConnected && user?.address) {
        const userStats = await realtimeService.getUserStats(user.address)
        setUser((prev) => (prev ? { ...prev, ...userStats } : null))
      }
    }
    fetchInitialData()

    return () => {
      realtimeService.disconnect()
    }
  }, [realtimeService, isConnected, user?.address, sessionIdRef.current]) // Added sessionIdRef.current as dependency

  const handleWalletConnect = async (address: string) => {
    setIsConnected(true)
    // Simulate fetching user data from backend after connect
    const userStats = await realtimeService.getUserStats(address)
    setUser({
      address,
      reputation: userStats.reputation,
      completedPromises: userStats.completedPromises,
      failedPromises: userStats.failedPromises,
      totalPromises: userStats.totalPromises,
      streak: userStats.streak,
      level: userStats.level,
    })
    toast.success("🎉 Wallet Connected!", {
      description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
    })
  }

  const createPromise = async (formData: {
    message: string
    deadline: string
    proof?: string
    category: string
    difficulty: "easy" | "medium" | "hard"
  }) => {
    if (!isConnected || !user?.address) {
      toast.error("❌ Wallet Not Connected", { description: "Please connect your MetaMask wallet first" })
      return
    }

    const newPromiseData = {
      address: user.address, // Use real connected address
      message: formData.message,
      deadline: new Date(formData.deadline).getTime(),
      status: "active" as const, // Explicitly set status
      proof: formData.proof,
      category: formData.category,
      difficulty: formData.difficulty,
    }

    try {
      // Use the backend to create the promise, which will generate a unique ID
      await realtimeService.createPromise(newPromiseData as Promise) // Cast to Promise
      // Immediately fetch updated promises to avoid waiting for real-time
      const updatedPromises = await realtimeService.getInitialPromises()
      setPromises(updatedPromises)
      setIsCreateModalOpen(false)

      toast.success("🚀 Promise Created!", {
        description: "Your promise has been recorded on the blockchain",
      })
    } catch (error) {
      console.error("Error creating promise:", error)
      toast.error("Failed to Create Promise", { description: "There was an error creating your promise." })
    }
  }

  const updatePromiseStatus = async (promiseId: string, status: "completed" | "failed", proof?: string) => {
    if (!isConnected || !user?.address) {
      toast.error("❌ Wallet Not Connected", { description: "Please connect your MetaMask wallet first" })
      return
    }

    const updatedPromise = promises.find((p) => p.id === promiseId)
    if (!updatedPromise) return

    try {
      await realtimeService.updatePromiseStatus(promiseId, status, proof, user.address)
      // The `onPromiseUpdate` listener will update `promises` state

      // Update local user stats immediately for responsiveness
      if (user) {
        const reputationChange = status === "completed" ? 10 : -5
        setUser((prev) =>
          prev
            ? {
                ...prev,
                reputation: Math.max(0, prev.reputation + reputationChange),
                completedPromises: status === "completed" ? prev.completedPromises + 1 : prev.completedPromises,
                failedPromises: status === "failed" ? prev.failedPromises + 1 : prev.failedPromises,
                streak: status === "completed" ? prev.streak + 1 : 0,
              }
            : null,
        )
      }

      const emoji = status === "completed" ? "🎉" : "😞"
      const change = status === "completed" ? "+10" : "-5"
      toast.success(`${emoji} Promise ${status === "completed" ? "Completed" : "Failed"}`, {
        description: `Status updated successfully. Reputation ${change}`,
      })
    } catch (error) {
      console.error("Error updating promise status:", error)
      toast.error("Failed to Update Status", { description: "There was an error updating promise status." })
    }
  }

  const requestDeletePromise = async (promiseId: string) => {
    if (!isConnected || !user?.address) {
      toast.error("❌ Wallet Not Connected", { description: "Please connect your MetaMask wallet first." })
      return
    }

    const promiseToRequestDelete = promises.find((p) => p.id === promiseId)
    if (!promiseToRequestDelete) {
      toast.error("Promise not found.", { description: "Could not find the promise to request deletion." })
      return
    }

    // Ensure only the owner can request deletion
    if (promiseToRequestDelete.address.toLowerCase() !== user.address.toLowerCase()) {
      toast.error("Permission Denied", { description: "You can only request deletion for your own promises." })
      return
    }

    try {
      await realtimeService.requestDeletePromise(promiseId, user.address)
      toast.info("🗑️ Delete Request Sent", {
        description: "Your request has been sent to the admin for approval.",
      })
    } catch (error) {
      console.error("Error requesting delete:", error)
      toast.error("Failed to Send Delete Request", { description: "There was an error sending your request." })
    }
  }

  const filteredPromises = promises.filter((promise) => {
    if (filter === "my" && user?.address) {
      return promise.address.toLowerCase() === user.address.toLowerCase()
    }
    if (filter === "all") return true
    return promise.status === filter
  })

  const getTimeRemaining = (deadline: number) => {
    const now = Date.now()
    const remaining = deadline - now
    if (remaining <= 0) return "⏰ Expired"

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) return `🗓️ ${days}d ${hours}h`
    return `⏰ ${hours}h`
  }

  const getProgressPercentage = (promise: Promise) => {
    // Use adminAdjustedProgress if available, otherwise calculate based on time
    if (typeof promise.adminAdjustedProgress === "number") {
      return Math.min(100, Math.max(0, promise.adminAdjustedProgress))
    }
    const now = Date.now()
    const total = promise.deadline - promise.createdAt
    const elapsed = now - promise.createdAt
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Learning: "bg-gradient-to-r from-purple-500 to-pink-500",
      Health: "bg-gradient-to-r from-green-500 to-emerald-500",
      Personal: "bg-gradient-to-r from-blue-500 to-cyan-500",
      Business: "bg-gradient-to-r from-orange-500 to-red-500",
      Creative: "bg-gradient-to-r from-yellow-500 to-orange-500",
    }
    return colors[category as keyof typeof colors] || "bg-gradient-to-r from-gray-500 to-gray-600"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="flex items-center gap-3 text-5xl font-bold leading-tight">
              <img
                src="/placeholder.svg?height=64&width=64"
                alt="Promise Registry Logo"
                className="w-16 h-16 object-contain" // Adjusted to w-16 h-16 for 64px
              />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Promise Registry
              </span>
            </h1>
            <p className="text-cyan-300 mt-3 text-lg ml-20">Commit to your goals on the blockchain ⛓️</p>
          </div>

          <div className="flex items-center gap-4">
            {user && isConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-right bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl"
              >
                <p className="text-sm text-purple-200">Reputation Score</p>
                <p className="text-3xl font-bold text-yellow-300">⭐ {user.reputation}</p>
                <p className="text-xs text-purple-200">
                  Level {user.level} • {user.streak} streak 🔥
                </p>
              </motion.div>
            )}

            <MetaMaskConnector onConnect={handleWalletConnect} isConnected={isConnected} />
            <Link href="/admin" passHref>
              <Button variant="outline" className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                <ShieldCheck className="w-4 h-4 mr-2" /> Admin Panel
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Global Stats */}
        {globalStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
          >
            <Card className="bg-gradient-to-r from-cyan-600 to-blue-600 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{globalStats.totalUsers.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Promises</CardTitle>
                  <Target className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{globalStats.totalPromises.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{globalStats.completionRate.toFixed(2)}%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-600 to-orange-600 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Avg Reputation</CardTitle>
                  <Award className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{globalStats.averageReputation.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-pink-600 to-red-600 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                  <Star className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-bold">
                  {globalStats.topPerformer
                    ? `${globalStats.topPerformer.slice(0, 6)}...${globalStats.topPerformer.slice(-4)}`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* User Stats */}
        {user && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">✅ Completed</CardTitle>
                  <CheckCircle className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{user.completedPromises}</p>
                <p className="text-sm opacity-80">+{user.completedPromises * 10} reputation</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-pink-500 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">❌ Failed</CardTitle>
                  <XCircle className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{user.failedPromises}</p>
                <p className="text-sm opacity-80">-{user.failedPromises * 5} reputation</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">⏳ Active</CardTitle>
                  <Clock className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{promises.filter((p) => p.status === "active").length}</p>
                <p className="text-sm opacity-80">In progress</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-yellow-500 border-0 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">🔥 Streak</CardTitle>
                  <Zap className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{user.streak}</p>
                <p className="text-sm opacity-80">Consecutive wins</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all">All Promises</SelectItem>
                {user && isConnected && <SelectItem value="my">My Promises</SelectItem>}
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg"
                disabled={!isConnected} // Disable if not connected
              >
                <Plus className="w-5 h-5 mr-2" />✨ Create Promise
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-purple-500/50 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Create New Promise
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  Make a public commitment that will be recorded on the blockchain
                </DialogDescription>
              </DialogHeader>
              <CreatePromiseForm onSubmit={createPromise} isConnected={isConnected} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Promises Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromises.map((promise) => (
            <PromiseCard
              key={promise.id}
              promise={promise}
              onUpdateStatus={updatePromiseStatus}
              onRequestDelete={requestDeletePromise} // Pass request delete handler
              currentUserAddress={user?.address} // Pass current user's address
              getTimeRemaining={getTimeRemaining}
              getProgressPercentage={getProgressPercentage}
              getCategoryColor={getCategoryColor}
            />
          ))}
        </motion.div>

        {filteredPromises.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-gray-300 text-xl">🔍 No promises found for the selected filter</p>
          </motion.div>
        )}
      </div>
      <Toaster theme="dark" />
    </div>
  )
}

function CreatePromiseForm({ onSubmit, isConnected }: { onSubmit: (data: any) => void; isConnected: boolean }) {
  const [formData, setFormData] = useState({
    message: "",
    deadline: "",
    proof: "",
    category: "Personal",
    difficulty: "medium" as "easy" | "medium" | "hard",
  })
  const [isSubmitting, setIsSubmitting] = useState(false) // New state for submission

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      toast.error("Wallet Not Connected", { description: "Please connect your MetaMask wallet first." })
      return
    }
    if (formData.message.length > 200) {
      toast.error("Message Too Long", { description: "Promise message cannot exceed 200 characters." })
      return
    }
    if (new Date(formData.deadline) <= new Date()) {
      toast.error("Invalid Deadline", { description: "Deadline must be in the future." })
      return
    }

    setIsSubmitting(true) // Disable button and fields
    try {
      await onSubmit(formData)
      setFormData({ message: "", deadline: "", proof: "", category: "Personal", difficulty: "medium" })
    } finally {
      setIsSubmitting(false) // Re-enable button and fields
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="message" className="text-purple-300">
          Promise Description
        </Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
          placeholder="What do you promise to achieve? 🎯"
          maxLength={200}
          className="bg-gray-800 border-purple-500/50 text-white placeholder:text-gray-400"
          required
          disabled={isSubmitting} // Disable while submitting
        />
        <p className="text-sm text-gray-400 mt-1">{formData.message.length}/200 characters</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category" className="text-purple-300">
            Category
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            disabled={isSubmitting} // Disable while submitting
          >
            <SelectTrigger className="bg-gray-800 border-purple-500/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="Learning">📚 Learning</SelectItem>
              <SelectItem value="Health">💪 Health</SelectItem>
              <SelectItem value="Personal">🌟 Personal</SelectItem>
              <SelectItem value="Business">💼 Business</SelectItem>
              <SelectItem value="Creative">🎨 Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty" className="text-purple-300">
            Difficulty
          </Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: any) => setFormData((prev) => ({ ...prev, difficulty: value }))}
            disabled={isSubmitting} // Disable while submitting
          >
            <SelectTrigger className="bg-gray-800 border-purple-500/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="easy">🟢 Easy</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="hard">🔴 Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="deadline" className="text-purple-300">
          Deadline
        </Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={formData.deadline}
          onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
          className="bg-gray-800 border-purple-500/50 text-white"
          required
          disabled={isSubmitting} // Disable while submitting
        />
      </div>

      <div>
        <Label htmlFor="proof" className="text-purple-300">
          Proof URL (Optional)
        </Label>
        <Input
          id="proof"
          type="url"
          value={formData.proof}
          onChange={(e) => setFormData((prev) => ({ ...prev, proof: e.target.value }))}
          placeholder="https://github.com/user/project 🔗"
          className="bg-gray-800 border-purple-500/50 text-white placeholder:text-gray-400"
          disabled={isSubmitting} // Disable while submitting
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl"
        disabled={!isConnected || isSubmitting} // Disable if not connected or submitting
      >
        {isSubmitting ? "Creating Promise..." : "🚀 Create Promise"}
      </Button>
    </form>
  )
}

function PromiseCard({
  promise,
  onUpdateStatus,
  onRequestDelete,
  currentUserAddress,
  getTimeRemaining,
  getProgressPercentage,
  getCategoryColor,
}: {
  promise: Promise
  onUpdateStatus: (id: string, status: "completed" | "failed", proof?: string) => void
  onRequestDelete: (id: string) => void
  currentUserAddress?: string
  getTimeRemaining: (deadline: number) => string
  getProgressPercentage: (promise: Promise) => number // Changed type to accept Promise object
  getCategoryColor: (category: string) => string
}) {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteRequestConfirmOpen, setIsDeleteRequestConfirmOpen] = useState(false)
  const [updateProof, setUpdateProof] = useState(promise.proof || "")

  const handleStatusUpdate = (status: "completed" | "failed") => {
    onUpdateStatus(promise.id, status, updateProof)
    setIsUpdateModalOpen(false)
  }

  const handleRequestDeleteClick = () => {
    setIsDeleteRequestConfirmOpen(true)
  }

  const handleConfirmRequestDelete = () => {
    onRequestDelete(promise.id)
    setIsDeleteRequestConfirmOpen(false)
  }

  const getStatusIcon = () => {
    switch (promise.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />
    }
  }

  const getStatusColor = () => {
    switch (promise.status) {
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-500"
      case "failed":
        return "bg-gradient-to-r from-red-500 to-pink-500"
      default:
        return "bg-gradient-to-r from-yellow-500 to-orange-500"
    }
  }

  const getDifficultyEmoji = () => {
    switch (promise.difficulty) {
      case "easy":
        return "🟢"
      case "medium":
        return "🟡"
      case "hard":
        return "🔴"
    }
  }

  // Check if the current user is the owner of the promise
  const isOwner = currentUserAddress?.toLowerCase() === promise.address.toLowerCase()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 h-full hover:bg-white/15 transition-all duration-300">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge className={`${getStatusColor()} text-white border-0`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{promise.status}</span>
            </Badge>
            <div className="text-right">
              <p className="text-xs text-gray-300">{getTimeRemaining(promise.deadline)}</p>
              <p className="text-xs text-gray-400">
                {getDifficultyEmoji()} {promise.difficulty}
              </p>
            </div>
          </div>

          <div className={`w-full h-1 rounded-full ${getCategoryColor(promise.category)} mb-3`}></div>

          <CardTitle className="text-lg text-white">{promise.message}</CardTitle>
          <CardDescription className="text-gray-300">
            📍 {promise.address.slice(0, 6)}...{promise.address.slice(-4)} • {promise.category}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {promise.status === "active" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">Progress</span>
                <span className="text-cyan-400">{Math.round(getProgressPercentage(promise))}%</span>
              </div>
              <Progress value={getProgressPercentage(promise)} className="h-2 bg-gray-700" />
            </div>
          )}

          {promise.proof && (
            <div>
              <p className="text-sm text-gray-300 mb-1">🔗 Proof:</p>
              <a
                href={promise.proof}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-sm break-all underline"
              >
                {promise.proof}
              </a>
            </div>
          )}

          {promise.status === "active" && ( // Only show update status if active
            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-purple-500/50 hover:bg-purple-500/20 bg-transparent text-white"
                >
                  ⚡ Update Status
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-purple-500/50 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Update Promise Status
                  </DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Mark this promise as completed or failed
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="update-proof" className="text-purple-300">
                      Proof URL (Optional)
                    </Label>
                    <Input
                      id="update-proof"
                      type="url"
                      value={updateProof}
                      onChange={(e) => setUpdateProof(e.target.value)}
                      placeholder="https://github.com/user/project 🔗"
                      className="bg-gray-800 border-purple-500/50 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStatusUpdate("completed")}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />✅ Completed
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate("failed")}
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />❌ Failed
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isOwner && ( // Show request delete button if current user is the owner, regardless of status
            <Button
              variant="outline"
              className="w-full border-red-500/50 hover:bg-red-500/20 bg-transparent text-red-400"
              onClick={handleRequestDeleteClick}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Request Delete
            </Button>
          )}

          {/* Delete Request Confirmation Dialog */}
          <Dialog open={isDeleteRequestConfirmOpen} onOpenChange={setIsDeleteRequestConfirmOpen}>
            <DialogContent className="bg-gray-900 border-red-500/50 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-xl bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center">
                  <Trash2 className="w-6 h-6 mr-2 text-red-400" /> Confirm Delete Request
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  Are you sure you want to request deletion for this promise? An admin will review your request.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteRequestConfirmOpen(false)}
                  className="border-gray-600 hover:bg-gray-800 bg-transparent text-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmRequestDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  )
}
