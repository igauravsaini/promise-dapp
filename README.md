# Public Promise Registry - Web3 dApp

A decentralized application built on Lisk blockchain that allows users to publicly commit to promises and track their completion on-chain.

## 🌟 Features

- **On-chain Promise Storage**: All promises are stored immutably on the Lisk blockchain
- **Reputation System**: Earn +1 reputation for completed promises, lose -2 for failed ones
- **Status Tracking**: Track promises as active, completed, or failed
- **Proof Submission**: Optional proof URLs (GitHub repos, documents, etc.)
- **Dark Theme UI**: Modern, responsive interface with Framer Motion animations
- **Real-time Updates**: Live status updates and progress tracking

## 🏗️ Architecture

### Backend (Lisk SDK)
- **Promise Module**: Custom Lisk SDK module for promise management
- **Create Promise Asset**: Transaction type for creating new promises
- **Update Status Asset**: Transaction type for updating promise status
- **Account Schema**: Extended account data with promises and reputation

### Frontend (Next.js + React)
- **Promise Dashboard**: View and manage all promises
- **Create Promise Form**: Submit new promises to blockchain
- **Status Updates**: Mark promises as completed or failed
- **Wallet Integration**: Connect with Lisk addresses
- **Progress Tracking**: Visual progress bars and time remaining

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Lisk SDK knowledge (optional)

### 1. Clone and Install
\`\`\`bash
git clone <repository-url>
cd public-promise-registry
npm install
\`\`\`

### 2. Setup Environment
\`\`\`bash
cp .env.example .env.local
# Edit .env.local with your configuration
\`\`\`

### 3. Start Frontend
\`\`\`bash
npm run dev
\`\`\`
Visit `http://localhost:3000`

### 4. Setup Blockchain Backend (Optional)
\`\`\`bash
cd scripts/lisk-backend
npm install
npm run dev
\`\`\`

## 🔧 Blockchain Integration

### Setting up Lisk Node

1. **Install Lisk SDK**:
\`\`\`bash
npm install -g lisk-sdk
\`\`\`

2. **Initialize Blockchain App**:
\`\`\`bash
lisk init promise-registry-blockchain
cd promise-registry-blockchain
\`\`\`

3. **Add Promise Module**:
Copy the promise module files from `scripts/lisk-backend/` to your Lisk app:
\`\`\`bash
cp scripts/lisk-backend/promise-module.js src/app/modules/
cp scripts/lisk-backend/app.js src/app/app.js
\`\`\`

4. **Start the Blockchain**:
\`\`\`bash
npm start
\`\`\`

### Connecting Frontend to Blockchain

1. **Update Environment Variables**:
\`\`\`env
LISK_NODE_URL=ws://localhost:8080/ws
LISK_HTTP_URL=http://localhost:4000
\`\`\`

2. **Install Lisk Client**:
\`\`\`bash
npm install @liskhq/lisk-client
\`\`\`

3. **Update Blockchain Service**:
Replace the mock implementation in `lib/blockchain-service.ts` with real Lisk client calls.

## 📱 Usage Guide

### Creating a Promise

1. **Connect Wallet**: Click "Connect Wallet" and enter your Lisk address
2. **Create Promise**: Click "Create Promise" button
3. **Fill Details**:
   - Promise description (max 200 characters)
   - Deadline (future date/time)
   - Optional proof URL
4. **Submit**: Transaction will be broadcast to blockchain

### Managing Promises

1. **View Dashboard**: See all your promises with status indicators
2. **Filter Promises**: Filter by active, completed, or failed
3. **Update Status**: Click "Update Status" on active promises
4. **Add Proof**: Include proof URLs when marking as completed

### Reputation System

- **+1 point**: Each completed promise
- **-2 points**: Each failed promise
- **Badges**: Earn badges based on reputation level
  - Beginner: 0-4 points
  - Achiever: 5-9 points  
  - Expert: 10-19 points
  - Legend: 20+ points

## 🛠️ Development

### Project Structure
\`\`\`
├── app/                    # Next.js app directory
├── components/            # React components
├── lib/                   # Utility libraries
├── scripts/
│   └── lisk-backend/     # Lisk blockchain module
├── public/               # Static assets
└── README.md
\`\`\`

### Key Components
- `app/page.tsx`: Main dashboard component
- `components/wallet-connect.tsx`: Wallet connection dialog
- `components/promise-stats.tsx`: Statistics display
- `lib/blockchain-service.ts`: Blockchain interaction service

### Blockchain Module Structure
- `promise-module.js`: Main Lisk module
- `blockchain-client.js`: Client for blockchain interactions
- `app.js`: Lisk application setup

## 🔗 Real Blockchain Integration

To connect with a real Lisk blockchain:

### 1. Setup Lisk Development Environment
\`\`\`bash
# Install Lisk Commander
npm install -g @liskhq/lisk-commander

# Create new blockchain app
lisk init my-promise-app
cd my-promise-app
\`\`\`

### 2. Integrate Promise Module
\`\`\`bash
# Copy module files
cp ../scripts/lisk-backend/promise-module.js src/app/modules/

# Update app.js to register module
# Add: app.registerModule(PromiseModule)
\`\`\`

### 3. Configure Network
\`\`\`bash
# Update config for development network
# Set proper network identifier and genesis block
\`\`\`

### 4. Start Blockchain Network
\`\`\`bash
# Start forging node
npm run start:devnet

# The blockchain will be available at:
# WebSocket: ws://localhost:8080/ws
# HTTP API: http://localhost:4000
\`\`\`

### 5. Update Frontend Configuration
\`\`\`typescript
// lib/blockchain-service.ts
const blockchainService = new BlockchainService('ws://localhost:8080/ws')

// Connect to real blockchain
await blockchainService.connect()
\`\`\`

## 🧪 Testing

### Mock Mode (Default)
The app runs in mock mode by default with simulated blockchain interactions.

### Integration Testing
1. Start local Lisk node
2. Update environment variables
3. Test promise creation and updates
4. Verify on-chain data storage

## 🚀 Deployment

### Frontend Deployment
\`\`\`bash
npm run build
npm start
\`\`\`

### Blockchain Deployment
1. Configure production Lisk network
2. Deploy promise module
3. Update frontend configuration
4. Test end-to-end functionality

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Include error logs and environment details

---

Built with ❤️ using Lisk SDK, Next.js, and TailwindCSS
