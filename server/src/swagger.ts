import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IdeaLab API",
      version: "1.0.0"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        IdeaCreateResponse: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string"
            }
          },
          example: {
            id: "64f1c2b5e4b0f1a2b3c4d5e6"
          }
        },
        UserProfile: {
          type: "object",
          required: ["id", "username", "email"],
          properties: {
            id: {
              type: "string"
            },
            username: {
              type: "string"
            },
            email: {
              type: "string"
            },
            avatarUrl: {
              type: "string",
              nullable: true
            }
          },
          example: {
            id: "64f1c2b5e4b0f1a2b3c4d5e6",
            username: "janedoe",
            email: "jane@example.com",
            avatarUrl: "https://cdn.example.com/uploads/avatars/jane.png"
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: "http://localhost:3001" }]
  },
  apis: ["src/routes/*.ts"]
});
