import { HttpResponse, Error, RevisionPage } from "@gitbook/api";

export type GitBookPage = HttpResponse<RevisionPage, Error>;
