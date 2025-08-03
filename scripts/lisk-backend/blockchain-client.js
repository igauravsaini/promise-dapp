const { apiClient, cryptography, transactions } = require("@liskhq/lisk-client")

class BlockchainClient {
  constructor(nodeUrl = "ws://localhost:8080/ws") {
    this.nodeUrl = nodeUrl
    this.client = null
  }

  async connect() {
    try {
      this.client = await apiClient.createWSClient(this.nodeUrl)
      console.log("Connected to Lisk node")
      return true
    } catch (error) {
      console.error("Failed to connect to Lisk node:", error)
      return false
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
    }
  }

  // Create a new promise transaction
  async createPromise(senderPassphrase, promiseData) {
    try {
      const { message, deadline, proof } = promiseData

      // Get network identifier
      const nodeInfo = await this.client.invoke("app:getNodeInfo")
      const networkIdentifier = nodeInfo.networkIdentifier

      // Get sender account info
      const senderAddress = cryptography.getAddressFromPassphrase(senderPassphrase)
      const account = await this.client.invoke("app:getAccount", {
        address: senderAddress.toString("hex"),
      })

      // Create transaction
      const tx = {
        moduleID: 1000, // Promise module ID
        assetID: 0, // CreatePromise asset ID
        nonce: BigInt(account.sequence.nonce),
        fee: BigInt(transactions.convertLSKToBeddows("0.1")),
        senderPublicKey: cryptography.getKeys(senderPassphrase).publicKey,
        asset: {
          message,
          deadline: Math.floor(new Date(deadline).getTime() / 1000),
          proof: proof || "",
        },
      }

      // Sign transaction
      const signedTx = transactions.signTransaction(tx, Buffer.from(networkIdentifier, "hex"), senderPassphrase)

      // Send transaction
      const result = await this.client.invoke("app:postTransaction", {
        transaction: signedTx,
      })

      return {
        success: true,
        transactionId: signedTx.id.toString("hex"),
        result,
      }
    } catch (error) {
      console.error("Error creating promise:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Update promise status transaction
  async updatePromiseStatus(senderPassphrase, updateData) {
    try {
      const { promiseId, status, proof } = updateData

      // Get network identifier
      const nodeInfo = await this.client.invoke("app:getNodeInfo")
      const networkIdentifier = nodeInfo.networkIdentifier

      // Get sender account info
      const senderAddress = cryptography.getAddressFromPassphrase(senderPassphrase)
      const account = await this.client.invoke("app:getAccount", {
        address: senderAddress.toString("hex"),
      })

      // Create transaction
      const tx = {
        moduleID: 1000, // Promise module ID
        assetID: 1, // UpdatePromiseStatus asset ID
        nonce: BigInt(account.sequence.nonce),
        fee: BigInt(transactions.convertLSKToBeddows("0.05")),
        senderPublicKey: cryptography.getKeys(senderPassphrase).publicKey,
        asset: {
          promiseId,
          status,
          proof: proof || "",
        },
      }

      // Sign transaction
      const signedTx = transactions.signTransaction(tx, Buffer.from(networkIdentifier, "hex"), senderPassphrase)

      // Send transaction
      const result = await this.client.invoke("app:postTransaction", {
        transaction: signedTx,
      })

      return {
        success: true,
        transactionId: signedTx.id.toString("hex"),
        result,
      }
    } catch (error) {
      console.error("Error updating promise status:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get promises for an address
  async getPromises(address) {
    try {
      const result = await this.client.invoke("promise:getPromises", {
        address,
      })
      return {
        success: true,
        promises: result,
      }
    } catch (error) {
      console.error("Error fetching promises:", error)
      return {
        success: false,
        error: error.message,
        promises: [],
      }
    }
  }

  // Get user statistics
  async getUserStats(address) {
    try {
      const result = await this.client.invoke("promise:getUserStats", {
        address,
      })
      return {
        success: true,
        stats: result,
      }
    } catch (error) {
      console.error("Error fetching user stats:", error)
      return {
        success: false,
        error: error.message,
        stats: { reputation: 0, completedPromises: 0, failedPromises: 0 },
      }
    }
  }

  // Get all promises (for public feed)
  async getAllPromises() {
    try {
      const result = await this.client.invoke("promise:getAllPromises")
      return {
        success: true,
        promises: result,
      }
    } catch (error) {
      console.error("Error fetching all promises:", error)
      return {
        success: false,
        error: error.message,
        promises: [],
      }
    }
  }
}

module.exports = BlockchainClient
