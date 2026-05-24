import swaggerJsdoc from "swagger-jsdoc";
import { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CapaCity API",
      version: "1.0.0",
      description:
        "B2B marketplace connecting industrial demand buyers (demandantes) with " +
        "manufacturing capacity suppliers (fornecedores). All protected routes require " +
        "either a Bearer JWT token or an `access_token` cookie.",
      contact: { name: "CapaCity Engineering", email: "dev@capacity.com.br" },
      license: { name: "Proprietary" },
    },
    servers: [
      { url: "/", description: "Current server" },
      { url: "http://localhost:3001", description: "Local development" },
    ],
    tags: [
      { name: "Auth", description: "Authentication & session management" },
      { name: "Demands", description: "Demand publications (demandante side)" },
      { name: "Proposals", description: "Supplier proposals on demands" },
      { name: "Orders", description: "Production orders" },
      { name: "Contracts", description: "Signed contracts" },
      { name: "NDAs", description: "Non-disclosure agreements" },
      { name: "Transactions", description: "Financial transactions & escrow" },
      { name: "Disputes", description: "Dispute resolution" },
      { name: "Reviews", description: "Post-transaction reviews" },
      { name: "Messages", description: "Conversations & messaging" },
      { name: "Notifications", description: "In-app notification feed" },
      { name: "Companies", description: "Company management (admin)" },
      { name: "Uploads", description: "File upload & retrieval" },
      { name: "Health", description: "Health & readiness probes" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Pass a JWT obtained from POST /api/auth/login in the Authorization header.",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token",
          description: "HttpOnly cookie set automatically after login. Used by browser clients.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", example: "Recurso não encontrado." },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  msg: { type: "string" },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            total: { type: "integer", example: 42 },
            limit: { type: "integer", example: 20 },
            offset: { type: "integer", example: 0 },
          },
        },
        AuthUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["demandante", "fornecedor", "admin"] },
            company_id: { type: "string", format: "uuid", nullable: true },
            avatar_url: { type: "string", format: "uri", nullable: true },
            email_verified_at: { type: "string", format: "date-time", nullable: true },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            totp_code: { type: "string", description: "6-digit TOTP if 2FA enabled" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "name", "role"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            name: { type: "string" },
            role: { type: "string", enum: ["demandante", "fornecedor"] },
            company_name: { type: "string" },
            cnpj: { type: "string", example: "12.345.678/0001-90" },
          },
        },
        TokenResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT access token" },
            user: { $ref: "#/components/schemas/AuthUser" },
          },
        },
        Company: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            cnpj: { type: "string" },
            status: { type: "string", enum: ["pendente", "ativo", "suspenso"] },
            city: { type: "string", nullable: true },
            state: { type: "string", nullable: true },
            logo_url: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Demand: {
          type: "object",
          properties: {
            id: { type: "string", example: "DM-1001" },
            title: { type: "string" },
            description: { type: "string" },
            process: { type: "string" },
            status: {
              type: "string",
              enum: ["Publicado", "Em cotação", "Em negociação", "Contratado", "Finalizado", "Cancelado"],
            },
            budget: { type: "number", nullable: true },
            deadline: { type: "string", format: "date", nullable: true },
            location: { type: "string", nullable: true },
            cert_required: { type: "string", nullable: true },
            categories: { type: "array", items: { type: "string" } },
            company_id: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        DemandCreate: {
          type: "object",
          required: ["title", "description", "process"],
          properties: {
            title: { type: "string", maxLength: 200 },
            description: { type: "string", maxLength: 5000 },
            process: { type: "string" },
            budget: { type: "number", nullable: true },
            deadline: { type: "string", format: "date", nullable: true },
            location: { type: "string", nullable: true },
            cert_required: { type: "string", nullable: true },
            categories: { type: "array", items: { type: "string" } },
          },
        },
        Proposal: {
          type: "object",
          properties: {
            id: { type: "string", example: "PR-1001" },
            demand_id: { type: "string", example: "DM-1001" },
            company_id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["Enviada", "Em análise", "Aceita", "Recusada", "Retirada"] },
            price: { type: "number" },
            lead_time_days: { type: "integer" },
            notes: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ProposalCreate: {
          type: "object",
          required: ["demand_id", "price", "lead_time_days"],
          properties: {
            demand_id: { type: "string" },
            price: { type: "number", minimum: 0 },
            lead_time_days: { type: "integer", minimum: 1 },
            notes: { type: "string", maxLength: 2000, nullable: true },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", example: "PD-1001" },
            demand_id: { type: "string" },
            proposal_id: { type: "string" },
            status: {
              type: "string",
              enum: ["Publicado", "Em cotação", "Contratado", "Em setup", "Em produção", "Em inspeção", "Aguardando coleta", "Em transporte", "Entregue", "Finalizado", "Cancelado"],
            },
            buyer_company_id: { type: "string", format: "uuid" },
            supplier_company_id: { type: "string", format: "uuid" },
            total_price: { type: "number" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Contract: {
          type: "object",
          properties: {
            id: { type: "string", example: "CT-1001" },
            order_id: { type: "string" },
            status: { type: "string", enum: ["Gerado", "Aguardando assinatura", "Assinado", "Cancelado"] },
            pdf_url: { type: "string", format: "uri", nullable: true },
            signed_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        NDA: {
          type: "object",
          properties: {
            id: { type: "string", example: "NDA-1001" },
            demand_id: { type: "string", nullable: true },
            party_a_company_id: { type: "string", format: "uuid" },
            party_b_company_id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["Pendente", "Ativo", "Expirado", "Cancelado"] },
            expires_at: { type: "string", format: "date-time", nullable: true },
            signed_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", example: "TXN-1001" },
            order_id: { type: "string" },
            type: { type: "string", enum: ["escrow_deposit", "release", "refund", "fee"] },
            amount: { type: "number" },
            status: { type: "string", enum: ["pendente", "processando", "concluído", "falhou"] },
            stripe_payment_intent_id: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Dispute: {
          type: "object",
          properties: {
            id: { type: "string", example: "DP-1001" },
            order_id: { type: "string" },
            opened_by_company_id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["Aberta", "Em análise", "Resolvida", "Encerrada"] },
            reason: { type: "string" },
            resolution: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        DisputeCreate: {
          type: "object",
          required: ["order_id", "reason"],
          properties: {
            order_id: { type: "string" },
            reason: { type: "string", maxLength: 3000 },
          },
        },
        Review: {
          type: "object",
          properties: {
            id: { type: "string", example: "RV-1001" },
            order_id: { type: "string" },
            author_company_id: { type: "string", format: "uuid" },
            target_company_id: { type: "string", format: "uuid" },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string", nullable: true },
            reply: { type: "string", nullable: true },
            moderated: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ReviewCreate: {
          type: "object",
          required: ["order_id", "rating"],
          properties: {
            order_id: { type: "string" },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string", maxLength: 2000, nullable: true },
          },
        },
        Conversation: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            demand_id: { type: "string", nullable: true },
            order_id: { type: "string", nullable: true },
            participant_ids: { type: "array", items: { type: "string", format: "uuid" } },
            last_message_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            conversation_id: { type: "string", format: "uuid" },
            sender_id: { type: "string", format: "uuid" },
            body: { type: "string" },
            attachment_url: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            type: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
            read: { type: "boolean" },
            ref_id: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Upload: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            filename: { type: "string" },
            content_type: { type: "string" },
            size: { type: "integer" },
            url: { type: "string", format: "uri" },
            uploaded_by: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      parameters: {
        limit: { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 200 } },
        offset: { name: "offset", in: "query", schema: { type: "integer", default: 0, minimum: 0 } },
        uuidParam: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      },
      responses: {
        Unauthorized: { description: "Not authenticated.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        Forbidden: { description: "Insufficient permissions.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        NotFound: { description: "Resource not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        BadRequest: { description: "Validation error.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    paths: {
      "/api/auth/register": { post: { tags: ["Auth"], summary: "Register a new user", security: [], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } }, responses: { "201": { description: "User created.", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } }, "400": { $ref: "#/components/responses/BadRequest" }, "409": { description: "E-mail already registered." } } } },
      "/api/auth/login": { post: { tags: ["Auth"], summary: "Login with email + password", security: [], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } }, responses: { "200": { description: "Login successful.", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } }, "401": { description: "Wrong credentials or account locked." }, "403": { description: "Email not verified." } } } },
      "/api/auth/logout": { post: { tags: ["Auth"], summary: "Revoke current session", responses: { "200": { description: "Logged out." }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
      "/api/auth/refresh": { post: { tags: ["Auth"], summary: "Refresh access token", security: [], responses: { "200": { description: "New access token issued.", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } }, "401": { description: "Invalid or expired refresh token." } } } },
      "/api/auth/me": { get: { tags: ["Auth"], summary: "Get current authenticated user", responses: { "200": { description: "Current user profile.", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthUser" } } } }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
      "/api/demands": { get: { tags: ["Demands"], summary: "List demands", parameters: [{ $ref: "#/components/parameters/limit" }, { $ref: "#/components/parameters/offset" }, { name: "status", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated demands.", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Demand" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } } } } } } }, post: { tags: ["Demands"], summary: "Create a demand", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DemandCreate" } } } }, responses: { "201": { description: "Created.", content: { "application/json": { schema: { $ref: "#/components/schemas/Demand" } } } }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
      "/api/demands/{id}": { get: { tags: ["Demands"], summary: "Get demand", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Demand.", content: { "application/json": { schema: { $ref: "#/components/schemas/Demand" } } } }, "404": { $ref: "#/components/responses/NotFound" } } }, patch: { tags: ["Demands"], summary: "Update demand", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DemandCreate" } } } }, responses: { "200": { description: "Updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/Demand" } } } }, "403": { $ref: "#/components/responses/Forbidden" } } }, delete: { tags: ["Demands"], summary: "Cancel demand", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Cancelled." } } } },
      "/api/orders/{id}": { get: { tags: ["Orders"], summary: "Get order", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Order.", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } }, "404": { $ref: "#/components/responses/NotFound" } } }, patch: { tags: ["Orders"], summary: "Advance order status", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string" } } } } } }, responses: { "200": { description: "Updated.", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } }, "400": { $ref: "#/components/responses/BadRequest" } } } },
      "/api/contracts/{id}": { get: { tags: ["Contracts"], summary: "Get contract", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Contract.", content: { "application/json": { schema: { $ref: "#/components/schemas/Contract" } } } } } } },
      "/api/disputes": { post: { tags: ["Disputes"], summary: "Open dispute", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DisputeCreate" } } } }, responses: { "201": { description: "Opened.", content: { "application/json": { schema: { $ref: "#/components/schemas/Dispute" } } } } } } },
      "/health/live": { get: { tags: ["Health"], summary: "Liveness probe", security: [], responses: { "200": { description: "Process alive." } } } },
      "/health": { get: { tags: ["Health"], summary: "Readiness probe", security: [], responses: { "200": { description: "All checks passed." }, "503": { description: "Check failed." } } } },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
