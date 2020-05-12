import {
  createConnection,
  DiagnosticSeverity,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection();
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
  },
}));

documents.onDidChangeContent((change) => {
  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics: [
      {
        range: {
          start: change.document.positionAt(0),
          end: change.document.positionAt(0),
        },
        severity: DiagnosticSeverity.Warning,
        message: "warning from the OpenRPC Language Server",
        source: "openrpc",
      },
    ],
  });
});

documents.listen(connection);
connection.listen();
