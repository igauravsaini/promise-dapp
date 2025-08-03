"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Wallet, Download, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface MetaMaskConnectorProps {
  onConnect: (address: string) => void
  isConnected: boolean
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export function MetaMaskConnector({ onConnect, isConnected }: MetaMaskConnectorProps) {
  const [isInstalling, setIsInstalling] = useState(false)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const isMetaMaskInstalled = () => {
    return typeof window !== "undefined" && window.ethereum && window.ethereum.isMetaMask
  }

  const installMetaMask = () => {
    setShowInstallDialog(true)
  }

  const handleInstallClick = () => {
    setIsInstalling(true)
    // Open MetaMask installation page
    window.open("https://metamask.io/download/", "_blank")

    // Check for installation every 2 seconds
    const checkInterval = setInterval(() => {
      if (isMetaMaskInstalled()) {
        clearInterval(checkInterval)
        setIsInstalling(false)
        setShowInstallDialog(false)
        toast.success("🎉 MetaMask Installed!", {
          description: "You can now connect your wallet",
        })
      }
    }, 2000)

    // Stop checking after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval)
      setIsInstalling(false)
    }, 60000)
  }

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      installMetaMask()
      return
    }

    try {
      setIsConnecting(true)

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length > 0) {
        const address = accounts[0]
        onConnect(address)

        // Listen for account changes
        window.ethereum.on("accountsChanged", (accounts: string[]) => {
          if (accounts.length > 0) {
            onConnect(accounts[0])
            toast.info("🔄 Account Changed", {
              description: `Switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
            })
          }
        })

        // Listen for chain changes
        window.ethereum.on("chainChanged", () => {
          window.location.reload()
        })
      }
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error)

      if (error.code === 4001) {
        toast.error("❌ Connection Rejected", {
          description: "You rejected the connection request",
        })
      } else {
        toast.error("❌ Connection Failed", {
          description: "Failed to connect to MetaMask",
        })
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    // MetaMask doesn't have a disconnect method, but we can clear our state
    toast.info("ℹ️ Wallet Disconnected", {
      description: "To fully disconnect, use MetaMask extension",
    })
  }

  if (isConnected) {
    return (
      <Button
        onClick={disconnectWallet}
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-xl"
      >
        <Wallet className="w-5 h-5 mr-2" />🟢 Connected
      </Button>
    )
  }

  return (
    <>
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg"
      >
        <Wallet className="w-5 h-5 mr-2" />
        {isConnecting ? "🔄 Connecting..." : "🦊 Connect MetaMask"}
      </Button>

      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="bg-gray-900 border-orange-500/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-orange-400" />
              MetaMask Required
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              MetaMask is not installed. You need MetaMask to connect your wallet and interact with the blockchain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-orange-300 mb-2">🦊 What is MetaMask?</h4>
              <p className="text-sm text-gray-300">
                MetaMask is a crypto wallet & gateway to blockchain apps. It's required to interact with this dApp.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {isInstalling ? "🔄 Installing..." : "📥 Install MetaMask"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowInstallDialog(false)}
                className="border-gray-600 hover:bg-gray-800 bg-transparent text-white"
              >
                Cancel
              </Button>
            </div>

            {isInstalling && (
              <div className="text-center text-sm text-gray-400">
                <p>🔍 Checking for MetaMask installation...</p>
                <p>Please refresh the page after installing MetaMask</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
