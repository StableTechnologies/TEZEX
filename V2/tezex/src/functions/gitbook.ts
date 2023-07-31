import { GitBookAPI } from "@gitbook/api";
import { GitBookPage } from "../types/gitbook";
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
export const fetchPage = async (
  spaceId: string,
  pageId: string,
  client?: GitBookAPI
): Promise<GitBookPage> => {
  try {
    const _client = client ? client : getClient();
    const page = await _client.spaces.getPageById(spaceId, pageId);
    return page;
  } catch (error) {
    console.error("Error fetching GitBook page :", error);
    throw error;
  }
};
