import React from "react";

interface ParagraphProps {
  text: string;
}

export const Paragraph: React.FC<ParagraphProps> = ({ text }) => {
  return <p>{text}</p>;
};

interface HeadingProps {
  level: number;
  text: string;
}

export const Heading: React.FC<HeadingProps> = ({ level, text }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag>{text}</Tag>;
};

interface ImagesProps {
  url: string;
  alt: string;
}

export const Images: React.FC<ImagesProps> = ({ url, alt }) => {
  return <img src={url} alt={alt} />;
};
