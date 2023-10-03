### Workflows

```mermaid
graph TB

     A((start)) --> B{push event triggered}
     
     B -- on:push --> C[Checkout code]
     C --> D[Setup pnpm]
     D --> E[Setup node]
     E --> F[Setup jq]
     F --> G[Setup temporary GitHub user]
     G --> H[Install Dependencies]
     H --> I[Build exchange-sdk]
     I --> J[Set current npm registry version in package.json]
     J --> K[Create a new version]
     K --> L[Publish package to npm registry]
     L --> M((end))
     
```