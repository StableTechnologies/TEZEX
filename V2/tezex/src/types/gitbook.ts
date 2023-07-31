import {
  HttpResponse,
  Error,
  RevisionPage,
  PageDocument,
  RevisionPageSheet,
} from "@gitbook/api";

export type GitBookResponse = HttpResponse<RevisionPage, Error>;
export type GitBookSheet = RevisionPageSheet;
export type GitBookPage = PageDocument;
