# Qdrant MCP Server

A server implementation that supports both Qdrant and Chroma vector databases for storing and retrieving domain knowledge.

## Features

- Support for both Qdrant and Chroma vector databases
- Configurable database selection via environment variables
- Uses Qdrant's built-in FastEmbed for efficient embedding generation
- Domain knowledge storage and retrieval
- Documentation file storage with metadata
- Support for PDF and TXT file formats

## Prerequisites

- Node.js 20.x or later (LTS recommended)
- npm 10.x or later
- Qdrant or Chroma vector database

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd qdrant-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory based on the `.env.example` template:
```bash
cp .env.example .env
```

4. Update the `.env` file with your own settings:
```env
DATABASE_TYPE=qdrant
QDRANT_URL=https://your-qdrant-instance.example.com:6333
QDRANT_API_KEY=your_api_key
COLLECTION_NAME=your_collection_name
```

5. Build the project:
```bash
npm run build
```

## AI IDE Integration

### Cursor AI IDE
Create the script `run-cursor-mcp.sh` in the project root:

```bash
#!/bin/zsh
cd /path/to/your/project
source ~/.zshrc
nvm use --lts

# Let the app load environment variables from .env file
node dist/index.js
```

Make the script executable:
```bash
chmod +x run-cursor-mcp.sh
```

Add this configuration to your `~/.cursor/mcp.json` or `.cursor/mcp.json` file:
```json
{
  "mcpServers": {
    "qdrant-retrieval": {
      "command": "/path/to/your/project/run-cursor-mcp.sh",
      "args": []
    }
  }
}
```

### Claude Desktop
Add this configuration in Claude's settings:
```json
{
  "processes": {
    "knowledge_server": {
      "command": "/path/to/your/project/run-cursor-mcp.sh",
      "args": []
    }
  },
  "tools": [
    {
      "name": "store_knowledge",
      "description": "Store domain-specific knowledge in a vector database",
      "provider": "process",
      "process": "knowledge_server"
    },
    {
      "name": "retrieve_knowledge_context",
      "description": "Retrieve relevant domain knowledge from a vector database",
      "provider": "process",
      "process": "knowledge_server"
    }
  ]
}
```

## Usage

### Starting the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Storing Documentation

The server includes a script to store documentation files (PDF and TXT) with metadata:

```bash
npm run store-doc <path-to-your-file>
```

Example:
```bash
# Store a PDF file
npm run store-doc docs/manual.pdf

# Store a text file
npm run store-doc docs/readme.txt
```

The script will:
- Extract content from the file (text from PDF or plain text)
- Store the content with metadata including:
  - Source: "documentation"
  - File name and extension
  - File size
  - Last modified date
  - Creation date
  - Content type

### API Endpoints

#### Store Domain Knowledge

```http
POST /api/store
Content-Type: application/json

{
  "content": "Your domain knowledge content here",
  "source": "your-source",
  "metadata": {
    "key": "value"
  }
}
```

#### Query Domain Knowledge

```http
POST /api/query
Content-Type: application/json

{
  "query": "Your search query here",
  "limit": 5
}
```

## Development

### Running Tests

```bash
npm test
```

### Building the Project

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── core/
│   ├── db-service.ts      # Database service implementation
│   └── embedding-utils.ts # Embedding utilities
├── scripts/
│   └── store-documentation.ts  # Documentation storage script
└── index.ts              # Main server file
```

## Using with Remote Qdrant

When using with a remote Qdrant instance (like Qdrant Cloud):

1. Ensure your `.env` has the correct URL with port number:
```
QDRANT_URL=https://your-instance-id.region.gcp.cloud.qdrant.io:6333
```

2. Set your API key:
```
QDRANT_API_KEY=your_qdrant_api_key
```

## FastEmbed Integration

This project uses Qdrant's built-in FastEmbed for efficient embedding generation:

### Benefits
- Lightweight and fast embedding generation
- Uses quantized model weights and ONNX Runtime for inference
- Better accuracy than OpenAI Ada-002 according to Qdrant
- No need for external embedding API keys

### How It Works
1. The system connects to your Qdrant instance
2. When generating embeddings, it uses Qdrant's server-side embedding endpoint
3. This eliminates the need for external embedding APIs and simplifies the architecture

### Configuration
No additional configuration is needed as FastEmbed is built into Qdrant. Just ensure your Qdrant URL and API key are correctly set in your `.env` file.

## Troubleshooting

If you encounter issues:

1. Make sure you're using Node.js LTS version (`nvm use --lts`)
2. Verify your environment variables are correct
3. Check Qdrant/Chroma connectivity
4. Ensure your Qdrant instance is properly configured

## License

MIT