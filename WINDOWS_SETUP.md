# Windows 11 Setup for Qdrant MCP Server

## Prerequisites
- Node.js 20.x or later (LTS recommended)
- npm 10.x or later
- Qdrant or Chroma vector database
- PowerShell 7+ recommended (Windows PowerShell 5.1 will also work)

## Installation Steps

1. Clone the repository:
```powershell
git clone <repository-url>
cd qdrant-mcp-server
```

2. Install dependencies:
```powershell
npm install
```

3. Create a `.env` file in the root directory:
```powershell
Copy-Item .env.example .env
```

4. Update the `.env` file with your settings using Notepad or any text editor:
```env
DATABASE_TYPE=qdrant
QDRANT_URL=https://your-qdrant-instance.example.com:6333
QDRANT_API_KEY=your_api_key
COLLECTION_NAME=your_collection_name
```

5. Build the project:
```powershell
npm run build
```

## AI IDE Integration

### Cursor AI IDE

1. Make sure the `run-cursor-mcp.ps1` script is in your project root directory.

2. Create the `.cursor` directory in your project root if it doesn't exist:
```powershell
mkdir -Force .cursor
```

3. Create or edit the `.cursor/mcp.json` file with this configuration:
```json
{
  "mcpServers": {
    "qdrant-retrieval": {
      "command": "powershell.exe",
      "args": ["-ExecutionPolicy", "Bypass", "-File", "C:\\Users\\ASUS\\vito-mcp\\run-cursor-mcp.ps1"]
    }
  }
}
```

4. If you need to allow PowerShell script execution, run this command as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Claude Desktop

1. In Claude Desktop settings, add this configuration (replace the path with your actual project path):
```json
{
  "processes": {
    "knowledge_server": {
      "command": "powershell.exe",
      "args": ["-ExecutionPolicy", "Bypass", "-File", "C:\\path\\to\\your\\project\\run-cursor-mcp.ps1"]
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

```powershell
npm start
```

For development with auto-reload:
```powershell
npm run dev
```

### Storing Documentation

```powershell
npm run store-doc docs/manual.pdf
# or
npm run store-doc docs/readme.txt
```

## Troubleshooting

1. **PowerShell Execution Policy**: If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

2. **Path Issues**: Ensure all paths use Windows-style backslashes (`\\`) and full paths where needed.

3. **Node Version**: Verify your Node.js version with:
```powershell
node --version
```

4. **Connection Issues**: Check your firewall settings if you're having trouble connecting to Qdrant. 