# InkSync Project Flow Diagram

## Complete User Journey Flow

```mermaid
flowchart TD
    A[User Opens Browser] --> B[Navigate to InkSync URL]
    B --> C{Is Room ID in URL?}

    C -->|No| D[Landing Page]
    C -->|Yes| E[Direct to Room]

    D --> F[User Enters Room ID]
    F --> G[Generate 20-char Room ID]
    G --> H[Redirect to /room/[roomId]]

    E --> I[Initialize Room Session]
    H --> I

    I --> J[Load Main Page Component]
    J --> K[Initialize Canvas & Tools]
    K --> L[Connect to Socket.io Server]

    L --> M{Connection Successful?}
    M -->|No| N[Show Error Message]
    M -->|Yes| O[Join Room via Socket]

    O --> P[Receive Current Canvas State]
    P --> Q[Display Canvas with Existing Elements]

    Q --> R[User Can Start Drawing]
    R --> S{User Action Type}

    S -->|Draw| T[Handle Drawing Action]
    S -->|Chat| U[Handle Chat Message]
    S -->|Tool Change| V[Update Tool Selection]
    S -->|Settings| W[Open Settings Menu]

    T --> X[Update Local Canvas State]
    X --> Y[Send Drawing Data to Server]
    Y --> Z[Server Broadcasts to Other Users]
    Z --> AA[Other Users Receive Update]
    AA --> BB[Other Users Redraw Canvas]

    U --> CC[Send Message to Server]
    CC --> DD[Server Broadcasts Message]
    DD --> EE[All Users Receive Message]
    EE --> FF[Display Message in Chat]

    V --> GG[Update Tool State]
    GG --> HH[Change Cursor/Interface]

    W --> II[Show Settings Options]
    II --> JJ{Setting Type}
    JJ -->|Clear Canvas| KK[Clear All Elements]
    JJ -->|Change Color| LL[Update Canvas Color]
    JJ -->|Stroke Width| MM[Update Stroke Width]
    JJ -->|Username| NN[Update User Name]

    KK --> OO[Broadcast Clear to All Users]
    LL --> PP[Update Canvas Background]
    MM --> QQ[Apply New Stroke Width]
    NN --> RR[Update User Display]

    R --> SS{User Continues?}
    SS -->|Yes| R
    SS -->|No| TT[User Closes Browser/Tab]

    TT --> UU[Socket Disconnect Event]
    UU --> VV[Remove User from Room]
    VV --> WW{Any Users Left in Room?}
    WW -->|Yes| XX[Keep Room Active]
    WW -->|No| YY[Delete Room & Clear State]

    XX --> ZZ[Room Remains Active for Reconnection]
    YY --> AAA[Clean Up Room Resources]
```

## Detailed Drawing Flow

```mermaid
flowchart TD
    A[User Clicks/Drags on Canvas] --> B{What Tool is Selected?}

    B -->|Pencil| C[Start Pencil Drawing]
    B -->|Line| D[Start Line Drawing]
    B -->|Rectangle| E[Start Rectangle Drawing]
    B -->|Circle| F[Start Circle Drawing]
    B -->|Eraser| G[Start Eraser Action]

    C --> H[Create Pencil Element Object]
    D --> I[Create Line Element Object]
    E --> J[Create Rectangle Element Object]
    F --> K[Create Circle Element Object]
    G --> L[Create Eraser Element Object]

    H --> M[Add to Elements Array]
    I --> M
    J --> M
    K --> M
    L --> M

    M --> N[Update Local State]
    N --> O[Redraw Canvas with Rough.js]
    O --> P[Send Element to Server]

    P --> Q[Server Receives Element]
    Q --> R[Update Room State]
    R --> S[Broadcast to Other Users]

    S --> T[Other Users Receive Element]
    T --> U[Add to Their Elements Array]
    U --> V[Redraw Their Canvas]

    V --> W{User Still Drawing?}
    W -->|Yes| X[Continue Drawing Flow]
    W -->|No| Y[Finish Drawing Action]

    X --> A
    Y --> Z[Drawing Complete]
```

## Real-time Synchronization Flow

```mermaid
sequenceDiagram
    participant U1 as User A
    participant U2 as User B
    participant C1 as Client A
    participant C2 as Client B
    participant S as Socket.io Server
    participant R as Room State

    Note over U1,R: Initial Connection
    U1->>C1: Open room URL
    C1->>S: joinRoom(roomId, userName)
    S->>R: Create/get room state
    R-->>S: Current canvas data
    S-->>C1: updateCanvas(elements, canvasColor)
    C1->>C1: Render canvas

    Note over U1,R: User B Joins
    U2->>C2: Open same room URL
    C2->>S: joinRoom(roomId, userName)
    S->>R: Add user to room
    R-->>S: Current canvas data
    S-->>C2: updateCanvas(elements, canvasColor)
    C2->>C2: Render canvas

    Note over U1,R: Real-time Drawing
    U1->>C1: Draw on canvas
    C1->>C1: Update local elements
    C1->>C1: Redraw with Rough.js
    C1->>S: updateCanvas(newElements)
    S->>R: Update room elements
    S->>C2: updateCanvas(newElements)
    C2->>C2: Update local elements
    C2->>C2: Redraw canvas

    Note over U1,R: Chat Interaction
    U1->>C1: Type message
    C1->>S: sendMessage(messageData)
    S->>R: Store message
    S->>C1: getMessage(messageData)
    S->>C2: getMessage(messageData)
    C2->>C2: Display message

    Note over U1,R: User Disconnection
    U1->>C1: Close browser
    C1->>S: disconnect event
    S->>R: Remove user from room
    alt No users left
        S->>R: Delete room
    end
```

## Component Interaction Flow

```mermaid
flowchart LR
    subgraph "Main Page Component"
        A[page.js - Main Controller]
    end

    subgraph "UI Components"
        B[Toolbar.jsx]
        C[Board.jsx]
        D[Chat.jsx]
        E[Session.jsx]
        F[Menu.jsx]
    end

    subgraph "State Management"
        G[Elements State]
        H[Tool State]
        I[Color State]
        J[Messages State]
        K[User State]
    end

    subgraph "External Services"
        L[Socket.io Client]
        M[Rough.js Engine]
        N[Local Storage]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    A --> F

    B --> H
    B --> I
    C --> G
    D --> J
    E --> K

    A --> L
    C --> M
    A --> N

    B -.->|Tool Change| C
    B -.->|Color Change| C
    B -.->|Stroke Width| C

    C -.->|Drawing Update| G
    G -.->|State Change| A
    A -.->|Sync| L

    D -.->|Send Message| L
    L -.->|Receive Message| J

    E -.->|User Info| N
    F -.->|Settings| A
```

## Data Flow Architecture

```mermaid
flowchart TD
    subgraph "User Input Layer"
        A[Mouse Events]
        B[Touch Events]
        C[Keyboard Events]
        D[UI Button Clicks]
    end

    subgraph "Event Processing"
        E[Event Handlers]
        F[Input Validation]
        G[State Updates]
    end

    subgraph "Local State"
        H[Elements Array]
        I[Tool Selection]
        J[Color Settings]
        K[Canvas Properties]
    end

    subgraph "Rendering Engine"
        L[Canvas Context]
        M[Rough.js Generator]
        N[Element Renderer]
    end

    subgraph "Communication Layer"
        O[Socket.io Client]
        P[Event Emitters]
        Q[Event Listeners]
    end

    subgraph "Server Processing"
        R[Socket.io Server]
        S[Room Manager]
        T[State Persistence]
    end

    subgraph "Broadcast Layer"
        U[Event Broadcasting]
        V[Room Filtering]
        W[Client Updates]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K

    H --> L
    H --> M
    M --> N
    N --> L

    G --> O
    O --> P
    P --> R

    R --> S
    S --> T
    T --> U
    U --> V
    V --> W

    W --> Q
    Q --> G
```

## Error Handling & Recovery Flow

```mermaid
flowchart TD
    A[Application Start] --> B{Check Connection}

    B -->|Connected| C[Normal Operation]
    B -->|Failed| D[Show Connection Error]

    C --> E{User Action}
    E -->|Draw| F[Process Drawing]
    E -->|Chat| G[Process Message]
    E -->|Tool Change| H[Update Tool]

    F --> I{Server Response}
    I -->|Success| J[Continue Normal Flow]
    I -->|Error| K[Retry Connection]

    G --> L{Message Sent?}
    L -->|Yes| M[Message Delivered]
    L -->|No| N[Queue Message]

    H --> O[Update Local State]

    K --> P{Reconnection Success?}
    P -->|Yes| Q[Resume Session]
    P -->|No| R[Show Offline Mode]

    Q --> S[Sync Pending Changes]
    S --> C

    R --> T[Local Only Mode]
    T --> U[Queue Changes for Later]

    N --> V[Retry on Reconnection]
    V --> W{Connection Restored?}
    W -->|Yes| X[Send Queued Messages]
    W -->|No| Y[Keep in Queue]

    X --> C
    Y --> T
```

## Performance Optimization Flow

```mermaid
flowchart LR
    subgraph "Input Optimization"
        A[Debounce Drawing Events]
        B[Throttle Mouse Movement]
        C[Batch State Updates]
    end

    subgraph "Rendering Optimization"
        D[Canvas Double Buffering]
        E[Element Caching]
        F[Selective Redraw]
    end

    subgraph "Network Optimization"
        G[WebSocket Compression]
        H[Message Batching]
        I[Connection Pooling]
    end

    subgraph "Memory Management"
        J[Element Cleanup]
        K[History Limiting]
        L[Garbage Collection]
    end

    A --> D
    B --> E
    C --> F

    D --> G
    E --> H
    F --> I

    G --> J
    H --> K
    I --> L

    J --> A
    K --> B
    L --> C
```

## Key Flow Summary

### **1. Application Startup Flow**

1. **User Access** → Browser opens InkSync URL
2. **Room Detection** → Check for room ID in URL
3. **Room Creation/Join** → Generate or use existing room ID
4. **Component Initialization** → Load React components
5. **Socket Connection** → Connect to real-time server
6. **State Synchronization** → Receive current canvas state

### **2. Drawing Flow**

1. **User Input** → Mouse/touch events on canvas
2. **Tool Processing** → Apply selected tool (pencil, line, etc.)
3. **Element Creation** → Create drawing element object
4. **Local Update** → Update local state and redraw
5. **Server Sync** → Send element to server via WebSocket
6. **Broadcast** → Server sends to all other users
7. **Remote Update** → Other users receive and redraw

### **3. Chat Flow**

1. **Message Input** → User types in chat
2. **Local Display** → Show message immediately
3. **Server Send** → Send message to server
4. **Broadcast** → Server sends to all room users
5. **Remote Display** → Other users see message

### **4. Room Management Flow**

1. **User Join** → Socket connection with room ID
2. **State Sync** → Receive current room state
3. **Active Session** → Real-time collaboration
4. **User Leave** → Remove from room
5. **Room Cleanup** → Delete room if empty

### **5. Error Recovery Flow**

1. **Connection Loss** → Detect disconnection
2. **Local Mode** → Continue drawing locally
3. **Reconnection** → Attempt to reconnect
4. **State Sync** → Sync pending changes
5. **Resume** → Return to normal operation

This flow ensures a smooth, real-time collaborative drawing experience with robust error handling and performance optimization!
