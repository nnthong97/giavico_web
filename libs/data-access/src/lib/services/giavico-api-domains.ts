const giavicoApiGatewayBaseUrl = 'http://localhost:8080';

export const GIAVICO_API_DOMAINS = {
  gateway: giavicoApiGatewayBaseUrl,
  formula: 'http://localhost:8081/api/formulas',
  inventory: 'http://localhost:8082/api/inventory',
  chat: 'http://localhost:8083/api/chat',
  rndDocuments: 'http://localhost:8084/api/rnd-documents',
} as const;

export const GIAVICO_GATEWAY_API_DOMAINS = {
  formula: `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory: `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat: `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
} as const;
