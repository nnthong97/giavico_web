# Product Specification & Change Control

The QMS feature is hosted by the dedicated `document` application and uses standalone, lazy-loaded Angular components.

## Backend connection

`QmsDocumentController` is the view-facing workflow boundary and `QmsDocumentRepository` is the mock persistence boundary. The repository currently seeds data and persists changes to browser `localStorage`. To connect the REST backend later, keep the controller method signatures and replace the repository bodies of `list`, `get`, `create`, `update`, `delete`, and `setStatus` with `HttpClient` calls.

Suggested endpoints:

```text
GET    /api/documents
GET    /api/documents/:id
POST   /api/documents
PUT    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/:id/status
```

Map the API DTOs to `QmsDocument` in the service so the dashboard, reusable table, dynamic editor, approvals, and audit view remain unchanged. The existing Java R&D document service under `integrations/giavico_service/rnd-document-service` is a suitable starting point for aligning document numbers and workflow transitions.
