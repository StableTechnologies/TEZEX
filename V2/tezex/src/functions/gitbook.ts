import { GitBookAPI } from "@gitbook/api";

export const getClient = (): GitBookAPI | null => {
  try {
    const accessToken = process.env.REACT_APP_GITBOOK_ACCESS_TOKEN;
    const client = new GitBookAPI({
      authToken: accessToken,
    });
    return client;
  } catch (error) {
    console.error("Error initializing GitBook client:", error);
    return null;
  }
};
export const fetchPage = async (
  client: GitBookAPI,
  spaceId: string,
  pageId: string
) => {
  try {
    const page = await client.spaces.getPageById(spaceId, pageId);
    return page;
  } catch (error) {
    console.error("Error fetching GitBook page :", error);
    return null;
  }
};
