graph TB
    subgraph "User Interface Layer"
        UI[React Frontend]
        Dashboard[Dashboard View]
        Chat[AI Chat Interface]
        Admin[Admin/Operator View]
        Consent[Consent Management UI]
    end

    subgraph "State Management"
        Zustand[Zustand Store]
        UserState[User State]
        PersonaState[Persona State]
        RecommendState[Recommendations State]
        ChatState[Chat History State]
    end

    subgraph "API Layer - Express REST"
        AuthAPI[POST /consent]
        ProfileAPI[GET /profile/:user_id]
        RecommendAPI[GET /recommendations/:user_id]
        ChatAPI[POST /chat]
        AdminAPI[GET /operator/*]
        UserAPI[POST /users]
    end

    subgraph "Business Logic Layer"
        Ingest[Data Ingestion Module]
        Features[Feature Engineering]
        PersonaEngine[Persona Assignment]
        RecommendEngine[Recommendation Engine]
        Guardrails[Guardrails Module]
        AIService[AI Service - GPT-4o-mini]
    end

    subgraph "Feature Detection"
        SubDetect[Subscription Detection]
        SavingsCalc[Savings Analysis]
        CreditMonitor[Credit Monitoring]
        IncomeStability[Income Stability]
    end

    subgraph "Persona System"
        HighUtil[High Utilization]
        VarIncome[Variable Income]
        SubHeavy[Subscription Heavy]
        SavingsBuild[Savings Builder]
        LifestyleCreep[Lifestyle Creep]
        PersonaPriority[Prioritization Logic]
    end

    subgraph "Recommendation System"
        ContentCatalog[Education Content Catalog]
        PartnerOffers[Partner Offer Catalog]
        Ranker[Impact/Urgency Ranker]
        Rationale[Rationale Generator]
        PaymentPlan[Debt Payment Planner]
    end

    subgraph "Data Storage - SQLite"
        UsersTable[(Users Table)]
        AccountsTable[(Accounts Table)]
        TransactionsTable[(Transactions Table)]
        LiabilitiesTable[(Liabilities Table)]
        ConsentsTable[(Consents Table)]
        PersonasTable[(Personas History)]
        RecommendationsTable[(Recommendations)]
        AuditLog[(Audit Log)]
    end

    subgraph "External Services"
        OpenAI[OpenAI API]
        Cache[Response Cache]
    end

    subgraph "Synthetic Data Generation"
        DataGen[Data Generator]
        UserProfiles[User Profile Generator]
        TxnGen[Transaction Generator]
        PersonaSeeding[Persona-Correlated Behaviors]
    end

    UI --> Dashboard
    UI --> Chat
    UI --> Admin
    UI --> Consent
    
    Dashboard --> Zustand
    Chat --> Zustand
    Admin --> Zustand
    Consent --> Zustand
    
    Zustand --> UserState
    Zustand --> PersonaState
    Zustand --> RecommendState
    Zustand --> ChatState
    
    UserState --> ProfileAPI
    PersonaState --> ProfileAPI
    RecommendState --> RecommendAPI
    ChatState --> ChatAPI
    
    Consent --> AuthAPI
    Admin --> AdminAPI
    
    AuthAPI --> Guardrails
    ProfileAPI --> Features
    RecommendAPI --> RecommendEngine
    ChatAPI --> AIService
    AdminAPI --> Guardrails
    
    Guardrails --> ConsentsTable
    Guardrails --> AuditLog
    
    Features --> SubDetect
    Features --> SavingsCalc
    Features --> CreditMonitor
    Features --> IncomeStability
    
    SubDetect --> TransactionsTable
    SavingsCalc --> AccountsTable
    SavingsCalc --> TransactionsTable
    CreditMonitor --> LiabilitiesTable
    CreditMonitor --> AccountsTable
    IncomeStability --> TransactionsTable
    
    Features --> PersonaEngine
    PersonaEngine --> HighUtil
    PersonaEngine --> VarIncome
    PersonaEngine --> SubHeavy
    PersonaEngine --> SavingsBuild
    PersonaEngine --> LifestyleCreep
    
    HighUtil --> PersonaPriority
    VarIncome --> PersonaPriority
    SubHeavy --> PersonaPriority
    SavingsBuild --> PersonaPriority
    LifestyleCreep --> PersonaPriority
    
    PersonaPriority --> PersonasTable
    PersonaEngine --> RecommendEngine
    
    RecommendEngine --> ContentCatalog
    RecommendEngine --> PartnerOffers
    RecommendEngine --> Ranker
    RecommendEngine --> Guardrails
    
    Ranker --> Rationale
    Rationale --> RecommendationsTable
    
    RecommendEngine --> PaymentPlan
    PaymentPlan --> LiabilitiesTable
    PaymentPlan --> TransactionsTable
    
    AIService --> OpenAI
    AIService --> Cache
    AIService --> TransactionsTable
    AIService --> PersonasTable
    
    DataGen --> UserProfiles
    DataGen --> TxnGen
    DataGen --> PersonaSeeding
    
    UserProfiles --> UsersTable
    TxnGen --> TransactionsTable
    TxnGen --> AccountsTable
    PersonaSeeding --> LiabilitiesTable
    
    AdminAPI --> UsersTable
    AdminAPI --> TransactionsTable
    AdminAPI --> PersonasTable
    AdminAPI --> RecommendationsTable
    
    style UI fill:#e3f2fd
    style Zustand fill:#f3e5f5
    style Features fill:#fff3e0
    style PersonaEngine fill:#e8f5e9
    style RecommendEngine fill:#fce4ec
    style Guardrails fill:#ffebee
    style AIService fill:#e1f5fe
    style DataGen fill:#f1f8e9