const giavicoApiGatewayBaseUrl = 'http://localhost:8080';

export const GIAVICO_API_DOMAINS = {
  gateway: giavicoApiGatewayBaseUrl,
  formula: `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory: `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat: `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
} as const;

export const GIAVICO_GATEWAY_API_DOMAINS = {
  formula: `${giavicoApiGatewayBaseUrl}/api/formulas`,
  inventory: `${giavicoApiGatewayBaseUrl}/api/inventory`,
  chat: `${giavicoApiGatewayBaseUrl}/api/chat`,
  rndDocuments: `${giavicoApiGatewayBaseUrl}/api/rnd-documents`,
} as const;
