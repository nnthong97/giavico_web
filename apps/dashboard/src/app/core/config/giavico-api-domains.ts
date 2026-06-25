const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const giavicoApiGatewayBaseUrl = isLocalDev ? 'http://localhost:8080' : '/api';

export const GIAVICO_API_DOMAINS = {
  gateway: giavicoApiGatewayBaseUrl,
  formula:      isLocalDev ? 'http://localhost:8081/api/formulas'     : '/api/formulas',
  inventory:    isLocalDev ? 'http://localhost:8082/api/inventory'    : '/api/inventory',
  chat:         isLocalDev ? 'http://localhost:8083/api/chat'         : '/api/chat',
  rndDocuments: isLocalDev ? 'http://localhost:8084/api/rnd-documents': '/api/rnd-documents',
  auth:         isLocalDev ? 'http://localhost:8085/api/auth'         : '/api/auth',
};

export const GIAVICO_GATEWAY_API_DOMAINS = {
  formula:      `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory:    `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat:         `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
};
