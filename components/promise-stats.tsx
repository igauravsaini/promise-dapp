"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, XCircle, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface PromiseStatsProps {
  stats: {
    reputation: number
    completedPromises: number
    failedPromises: number
    activePromises: number
  }
}

export function PromiseStats({ stats }: PromiseStatsProps) {
  const getReputationColor = (reputation: number) => {
    if (reputation >= 20) return "text-purple-400"
    if (reputation >= 10) return "text-blue-400"
    if (reputation >= 5) return "text-green-400"
    if (reputation >= 0) return "text-yellow-400"
    return "text-red-400"
  }

  const getReputationBadge = (reputation: number) => {
    if (reputation >= 20) return { label: "Legend", color: "bg-purple-600" }
    if (reputation >= 10) return { label: "Expert", color: "bg-blue-600" }
    if (reputation >= 5) return { label: "Achiever", color: "bg-green-600" }
    if (reputation >= 0) return { label: "Beginner", color: "bg-yellow-600" }
    return { label: "Struggling", color: "bg-red-600" }
  }

  const badge = getReputationBadge(stats.reputation)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-400">Reputation</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className={`text-3xl font-bold ${getReputationColor(stats.reputation)}`}>{stats.reputation}</p>
              <Badge className={badge.color}>{badge.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-400">Completed</CardTitle>
              <Target className="w-4 h-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{stats.completedPromises}</p>
            <p className="text-xs text-gray-500 mt-1">+{stats.completedPromises} reputation</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-400">Failed</CardTitle>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{stats.failedPromises}</p>
            <p className="text-xs text-gray-500 mt-1">-{stats.failedPromises * 2} reputation</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{stats.activePromises}</p>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
