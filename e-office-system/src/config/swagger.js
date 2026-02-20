import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0", // The industry standard version we are using
    info: {
      title: "Maharashtra Mandal e-Office API",
      version: "1.0.0",
      description:
        "Complete API Documentation for the E-Office System including Auth, E-Files, and Workflows.",
      contact: {
        name: "Backend Developer",
      },
    },
    servers: [
      {
        url: "http://localhost:4000/api/v1",
        description: "Local Development Server",
      },
    ],
    // This section defines how we handle Security (Login Tokens)
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT", // We are using JSON Web Tokens
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "jwt",
        },
      },
    },
    // This applies the security globally (optional, but good for defaults)
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  // 🚨 CRITICAL PART: This tells Swagger to look inside your route files for comments
  apis: ["./src/routes/*.js", "./src/modules/**/routes/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
