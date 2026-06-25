const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const giavicoApiGatewayBaseUrl = isLocalDev ? 'http://localhost:8080' : '/api';

export const GIAVICO_API_DOMAINS = {
  gateway: giavicoApiGatewayBaseUrl,
  formula: `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory: `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat: `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
} as const;

export const GIAVICO_GATEWAY_API_DOMAINS = {
  formula:      `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory:    `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat:         `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
};
