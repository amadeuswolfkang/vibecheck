# Vibecheck

Vibecheck is an advanced feedback analysis system that processes and analyzes email feedback using AI to provide actionable insights and sentiment analysis.

## Core Features

### 1. Email Analysis Pipeline
- Fetches emails via Gmail API
- Processes content using AI models
- Extracts key insights

### 2. Sentiment Analysis
- Multi-model approach using OpenAI
- Real-time processing
- Detailed sentiment breakdown

### 3. Insight Generation
- Feature request tracking
- Common theme identification

## Data Flow & Processing Pipeline

### 1. High-Level System Overview

```mermaid
graph LR
    subgraph "Stage 1: Fast Sentiment Classification"
        A("Email<br>Content") -->|"embedding<br>vectors"| B("Quick<br>Sentiment<br>Classification")
        B -->|"positive/negative<br>neutral/mixed"| C("Initial<br>Labels")
    end

    subgraph "Stage 2: Deep Analysis"
        C -->|"pre-classified<br>sentiments"| D("GPT-3.5<br>Analysis")
        D -->|"extract"| E("Praise<br>Points")
        D -->|"extract"| F("Pain<br>Points")
        D -->|"extract"| G("Feature<br>Requests")
        D -->|"generate"| H("Action<br>Items")
    end
```

This overview diagram shows the two main processing stages of the system:
1. Fast classification using embedding vectors for quick sentiment analysis
2. Deep analysis using GPT for extracting detailed insights

The following sections detail each component of this pipeline.

### 2. Email Ingestion & Caching (`lib/gmail.ts`, `lib/cache.ts`)

```mermaid
graph LR
    A("Gmail<br>API") -->|fetchGmailMessages| B("Raw<br>Messages")
    B -->|generateKey| C{"Cache<br>Check"}
    C -->|"Cache Miss"| D("Continue to<br>Processing")
    C -->|"Cache Hit<br>(24h TTL)"| E("Return<br>Cached Data")
```

### 3. Fast Sentiment Classification (`lib/openai.ts`)

```mermaid
graph LR
    subgraph "Quick Classification Stage"
        A("Input<br>Messages") -->|"batch<br>size=20"| B("Message<br>Batches")
        B -->|"embeddings<br>.create"| C("Embedding<br>Vectors")
        C -->|"compare with<br>anchors"| D("Vector<br>Similarity")
        D -->|"apply<br>thresholds"| E("Initial<br>Sentiments")
    end
    
    F("Positive Vector") -.->|"compare"| D
    G("Negative Vector") -.->|"compare"| D
    H("Neutral Vector") -.->|"compare"| D
```

### 4. Deep Insight Analysis (`lib/openai.ts`)

```mermaid
graph LR
    subgraph "GPT Analysis Stage"
        A("Messages +<br>Sentiments") -->|"chunk<br>size=25"| B("Analysis<br>Chunks")
        B -->|"format with<br>sentiments"| C("GPT Input<br>Context")
        C -->|"chat<br>.create"| D("GPT-3.5<br>Analysis")
    end
    
    subgraph "Insight Extraction"
        D -->|"parse"| E("Detailed<br>Insights")
        E -->|"categorize"| F("Praise<br>Points")
        E -->|"identify"| G("Pain<br>Points")
        E -->|"extract"| H("Feature<br>Requests")
        E -->|"summarize"| I("Action<br>Items")
    end
```

### 5. Result Aggregation (`lib/openai.ts`)

```mermaid
graph LR
    subgraph "Merge Results"
        A("Chunk<br>Results") -->|"combine"| B("Merged<br>Insights")
        B -->|"select"| C("Top<br>Items")
    end
    
    subgraph "Final Processing"
        C -->|"format"| D("Final<br>Report")
        D -->|"include"| E("Sentiment<br>Stats")
        D -->|"include"| F("Key<br>Insights")
        D -->|"include"| G("Action<br>Items")
    end
```

### 6. UI State Management (`pages/api/gmail.ts`)

```mermaid
graph LR
    subgraph "UI State Handler"
        A("Current<br>State") -->|"backup"| B("Previous<br>State")
        B -->|"500ms"| C("Fade<br>Animation")
    end
    
    subgraph "Data Updates"
        C -->|"POST"| D{"API<br>Result"}
        D -->|"success"| E("Update UI +<br>Clear Old")
        D -->|"error"| F("Restore<br>Previous")
        E -->|"set"| G("Loading +<br>Analysis: false")
        F -->|"set"| G
    end
```

