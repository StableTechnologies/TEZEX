import { GitBookAPI } from "@gitbook/api";
import { GitBookResponse } from "../types/gitbook";
import { PageDocument, RevisionPageSheet } from "@gitbook/api";

export const getClient = (): GitBookAPI => {
  try {
    const accessToken = process.env.REACT_APP_GITBOOK_ACCESS_TOKEN;
    const client = new GitBookAPI({
      authToken: accessToken,
    });
    return client;
  } catch (error) {
    console.error("Error initializing GitBook client:", error);
    throw error;
  }
};

export const fetchDoc = async (
  spaceId: string,
  pageId: string,
  client?: GitBookAPI
): Promise<PageDocument | null> => {
  return await fetchSheet(spaceId, pageId, client)
    .then((sheet: RevisionPageSheet) => {
      if ("document" in sheet) {
        const doc: PageDocument = sheet.document;
        return doc;
      } else throw "No Document found";
    })
    .catch((e) => {
      console.error(e);
      return null;
    });
};

const responseToSheet = (response: GitBookResponse): RevisionPageSheet => {
  if (response.data.kind == "sheet") {
    return response.data as RevisionPageSheet;
  } else {
    throw `Unimplemented page type : ${response.data.kind}`;
  }
};

const fetchSheet = async (
  spaceId: string,
  pageId: string,
  client?: GitBookAPI
): Promise<RevisionPageSheet> => {
  try {
    const response: GitBookResponse = await fetchPage(spaceId, pageId, client);
    return responseToSheet(response);
  } catch (error) {
    console.error("Error fetching GitBook sheet :", error);
    throw error;
  }
};

export const fetchPage = async (
  spaceId: string,
  pageId: string,
  client?: GitBookAPI
): Promise<GitBookResponse> => {
  try {
    const _client = client ? client : getClient();
    const page = await _client.spaces.getPageById(spaceId, pageId);
    return page;
  } catch (error) {
    console.error("Error fetching GitBook page :", error);
    throw error;
  }
};
