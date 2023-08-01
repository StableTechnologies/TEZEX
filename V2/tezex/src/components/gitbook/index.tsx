import React from "react";
import { Paragraph, Heading, Images } from "./blocks";
// import { GitBookAPI , HttpResponse , Error, RevisionPage } from "@gitbook/api";
import { GitBookSheet } from "../../types/gitbook";

const GitBookPage: React.FC<{ page: GitBookSheet }> = ({ page }) => {
  const renderNodes = (nodes: any[]) => {
    return nodes.map((node, index) => {
      if (node.object === "block") {
        switch (node.type) {
          case "paragraph":
            return (
              <Paragraph key={index} text={node.nodes[0].leaves[0].text} />
            );
          case "heading-1":
          case "heading-2":
          case "heading-3":
            return (
              <Heading
                key={index}
                level={parseInt(node.type.slice(-1), 10)}
                text={node.nodes[0].leaves[0].text}
              />
            );
          case "images":
            return (
              <Images key={index} url={node.data.ref.url} alt={node.data.alt} />
            );
          // Add cases for other block types if needed
          default:
            return null;
        }
      }
      return null;
    });
  };

  return <div>{renderNodes(page.document.nodes)}</div>;
};

export default GitBookPage;
