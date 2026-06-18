# Product Specification & Change Control

The QMS feature is mounted at `/qms` and uses standalone, lazy-loaded Angular components.

## Backend connection

`QmsDocumentService` is the mock API boundary. It currently seeds data and persists changes to browser `localStorage`. To connect the REST backend later, keep the component-facing method signatures and replace the bodies of `list`, `get`, `create`, `update`, `delete`, and `setStatus` with `HttpClient` calls.

Suggested endpoints:

```text
GET    /api/qms/documents
GET    /api/qms/documents/:id
POST   /api/qms/documents
PUT    /api/qms/documents/:id
DELETE /api/qms/documents/:id
POST   /api/qms/documents/:id/status
```

Map the API DTOs to `QmsDocument` in the service so the dashboard, reusable table, dynamic editor, approvals, and audit view remain unchanged. The existing Java R&D document service under `integrations/giavico_service/rnd-document-service` is a suitable starting point for aligning document numbers and workflow transitions.
