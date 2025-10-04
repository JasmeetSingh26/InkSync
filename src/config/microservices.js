// Frontend configuration for microservices
const MICROSERVICES_CONFIG = {
  // API Gateway - entry point for all HTTP requests
  apiGateway: {
    baseUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:4000",
    endpoints: {
      health: "/health",
      services: "/services",
      websocket: "/api/websocket",
    },
  },

  // WebSocket Gateway - for real-time communication
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:4004",
    options: {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
    },
  },

  // Service endpoints through API Gateway
  services: {
    rooms: "/api/rooms",
    drawing: "/api/drawing",
    chat: "/api/chat",
  },
};

export default MICROSERVICES_CONFIG;
