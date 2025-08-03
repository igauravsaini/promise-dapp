const { BaseModule, BaseAsset } = require("lisk-sdk")

// Promise Module
class PromiseModule extends BaseModule {
  name = "promise"
  id = 1000

  accountSchema = {
    type: "object",
    properties: {
      promises: {
        type: "array",
        fieldNumber: 1,
        items: {
          type: "object",
          properties: {
            id: { dataType: "string", fieldNumber: 1 },
            message: { dataType: "string", fieldNumber: 2 },
            deadline: { dataType: "uint32", fieldNumber: 3 },
            status: { dataType: "string", fieldNumber: 4 },
            proof: { dataType: "string", fieldNumber: 5 },
            createdAt: { dataType: "uint32", fieldNumber: 6 },
          },
        },
      },
      reputation: { dataType: "uint32", fieldNumber: 2, default: 0 },
      completedPromises: { dataType: "uint32", fieldNumber: 3, default: 0 },
      failedPromises: { dataType: "uint32", fieldNumber: 4, default: 0 },
    },
  }

  actions = {
    getPromises: async (params) => {
      const { address } = params
      const account = await this._dataAccess.getAccountByAddress(address)
      return account.promise?.promises || []
    },

    getAllPromises: async () => {
      // This would require custom database queries in a real implementation
      // For now, return empty array
      return []
    },

    getUserStats: async (params) => {
      const { address } = params
      const account = await this._dataAccess.getAccountByAddress(address)
      return {
        reputation: account.promise?.reputation || 0,
        completedPromises: account.promise?.completedPromises || 0,
        failedPromises: account.promise?.failedPromises || 0,
      }
    },
  }
}

// Create Promise Asset
class CreatePromiseAsset extends BaseAsset {
  name = "createPromise"
  id = 0

  schema = {
    $id: "promise/createPromise-asset",
    title: "CreatePromise transaction asset for promise module",
    type: "object",
    required: ["message", "deadline"],
    properties: {
      message: {
        dataType: "string",
        fieldNumber: 1,
        maxLength: 200,
      },
      deadline: {
        dataType: "uint32",
        fieldNumber: 2,
      },
      proof: {
        dataType: "string",
        fieldNumber: 3,
        maxLength: 500,
      },
    },
  }

  validate({ asset }) {
    if (!asset.message || asset.message.length === 0) {
      throw new Error("Promise message is required")
    }

    if (asset.message.length > 200) {
      throw new Error("Promise message cannot exceed 200 characters")
    }

    const currentTime = Math.floor(Date.now() / 1000)
    if (asset.deadline <= currentTime) {
      throw new Error("Deadline must be in the future")
    }
  }

  async apply({ asset, transaction, stateStore }) {
    const senderAddress = transaction.senderAddress
    const senderAccount = await stateStore.account.get(senderAddress)

    const newPromise = {
      id: transaction.id.toString("hex"),
      message: asset.message,
      deadline: asset.deadline,
      status: "active",
      proof: asset.proof || "",
      createdAt: Math.floor(Date.now() / 1000),
    }

    const promises = senderAccount.promise?.promises || []
    promises.push(newPromise)

    await stateStore.account.set(senderAddress, {
      ...senderAccount,
      promise: {
        ...senderAccount.promise,
        promises,
      },
    })
  }
}

// Update Promise Status Asset
class UpdatePromiseStatusAsset extends BaseAsset {
  name = "updatePromiseStatus"
  id = 1

  schema = {
    $id: "promise/updatePromiseStatus-asset",
    title: "UpdatePromiseStatus transaction asset for promise module",
    type: "object",
    required: ["promiseId", "status"],
    properties: {
      promiseId: {
        dataType: "string",
        fieldNumber: 1,
      },
      status: {
        dataType: "string",
        fieldNumber: 2,
      },
      proof: {
        dataType: "string",
        fieldNumber: 3,
        maxLength: 500,
      },
    },
  }

  validate({ asset }) {
    if (!["completed", "failed"].includes(asset.status)) {
      throw new Error('Status must be either "completed" or "failed"')
    }
  }

  async apply({ asset, transaction, stateStore }) {
    const senderAddress = transaction.senderAddress
    const senderAccount = await stateStore.account.get(senderAddress)

    const promises = senderAccount.promise?.promises || []
    const promiseIndex = promises.findIndex((p) => p.id === asset.promiseId)

    if (promiseIndex === -1) {
      throw new Error("Promise not found")
    }

    if (promises[promiseIndex].status !== "active") {
      throw new Error("Promise is not active")
    }

    // Update promise status
    promises[promiseIndex].status = asset.status
    if (asset.proof) {
      promises[promiseIndex].proof = asset.proof
    }

    // Update reputation and stats
    const currentReputation = senderAccount.promise?.reputation || 0
    const currentCompleted = senderAccount.promise?.completedPromises || 0
    const currentFailed = senderAccount.promise?.failedPromises || 0

    const reputationChange = asset.status === "completed" ? 1 : -2
    const newReputation = Math.max(0, currentReputation + reputationChange)

    await stateStore.account.set(senderAddress, {
      ...senderAccount,
      promise: {
        promises,
        reputation: newReputation,
        completedPromises: asset.status === "completed" ? currentCompleted + 1 : currentCompleted,
        failedPromises: asset.status === "failed" ? currentFailed + 1 : currentFailed,
      },
    })
  }
}

// Register assets with module
PromiseModule.prototype.transactionAssets = [new CreatePromiseAsset(), new UpdatePromiseStatusAsset()]

module.exports = { PromiseModule, CreatePromiseAsset, UpdatePromiseStatusAsset }
