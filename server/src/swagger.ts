import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IdeaLab API",
      version: "1.0.0"
    },
    servers: [{ url: "/api" }]
  },
  apis: ["src/routes/*.ts"]
});
