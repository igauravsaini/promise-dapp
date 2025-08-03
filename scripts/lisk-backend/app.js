const { Application, genesisBlockDevnet, configDevnet } = require("lisk-sdk")
const { PromiseModule } = require("./promise-module")

// Create the application instance
const app = Application.defaultApplication(genesisBlockDevnet, configDevnet)

// Register the Promise module
app.registerModule(PromiseModule)

// Start the application
app
  .run()
  .then(() => console.log("Promise Registry blockchain app started"))
  .catch(console.error)

module.exports = app
