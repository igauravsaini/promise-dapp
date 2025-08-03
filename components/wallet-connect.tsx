"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { blockchainService } from "@/lib/blockchain-service"

interface WalletConnectProps {
  onConnect: (address: string) => void
  isConnected: boolean
}

export function WalletConnect({ onConnect, isConnected }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    if (address.trim()) {
      // Use provided address
      setIsConnecting(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      onConnect(address.trim())
      setIsOpen(false)
      setIsConnecting(false)
      toast.success("Wallet Connected", {
        description: `Connected with address: ${address.slice(0, 8)}...${address.slice(-8)}`,
      })
    } else {
      // Generate demo address
      const demoAddress = blockchainService.generateAddress()
      onConnect(demoAddress)
      setIsOpen(false)
      toast.info("Demo Wallet Connected", {
        description: `Connected with demo address: ${demoAddress.slice(0, 8)}...${demoAddress.slice(-8)}`,
      })
    }
  }

  const generateDemoAddress = () => {
    const demoAddress = blockchainService.generateAddress()
    setAddress(demoAddress)
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.info("Address Copied", { description: "Address copied to clipboard" })
    }
  }

  if (isConnected) {
    return (
      <Button disabled className="bg-green-600">
        <Wallet className="w-4 h-4 mr-2" />
        Connected
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Connect Your Lisk Wallet</DialogTitle>
          <DialogDescription>Enter your Lisk address or generate a demo address for testing</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Lisk Address</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg93jn"
                className="bg-gray-700 border-gray-600 text-white"
              />
              {address && (
                <Button variant="outline" size="icon" onClick={copyAddress} className="border-gray-600 bg-transparent">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateDemoAddress}
              className="flex-1 border-gray-600 hover:bg-gray-700 bg-transparent"
            >
              Generate Demo Address
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          </div>

          <div className="text-sm text-gray-400 space-y-2">
            <p>
              <strong>For Testing:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click "Generate Demo Address" for a random Lisk address</li>
              <li>Or enter your actual Lisk address if you have one</li>
              <li>This demo uses mock data - no real transactions are made</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
